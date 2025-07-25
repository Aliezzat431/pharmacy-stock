import { connectDB } from "@/app/lib/connectDb";
import Product from "@/app/models/product.model";
import Debtor from "@/app/models/debtor.model";
import winningModel from "@/app/models/winning.model";
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/verifyToken";

export async function POST(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { name, orders, type } = body;

    if (!name || !Array.isArray(orders)) {
      return NextResponse.json({ message: "Name and orders are required" }, { status: 400 });
    }

    const today = new Date();
    let totalCost = 0;
    const detailedItems = [];
    const reasonParts = [];

    // ✅ Special case for agel (إيداع بدون منتج)
    if (type === "agel") {
      for (const item of orders) {
        const { name: description, quantity } = item;

        if (!description || !quantity) continue;

        const amount = Number(quantity);
        if (isNaN(amount) || amount <= 0) continue;

        totalCost += amount;

        detailedItems.push({
          name: description,
          unit: "جنيه",
          quantity: amount,
          price: amount,
          total: amount,
          fullProduct: null,
        });

        reasonParts.push(`${amount} جنيه لإيداع: ${description}`);
      }
    } else {
      for (const item of orders) {
        const { name: productName, unit, quantity } = item;
        const product = await Product.findOne({ name: productName });
        if (!product) continue;

        if (product.expiryDate && new Date(product.expiryDate) <= today) {
          return NextResponse.json({
            message: `المنتج "${product.name}" منتهي الصلاحية ولا يمكن إضافته.`,
          }, { status: 400 });
        }

        let quantityToDecrement = quantity;
        if (unit !== product.unit && product.unitConversion) {
          quantityToDecrement = quantity / product.unitConversion;
        }

        product.quantity -= quantityToDecrement;
        if (product.quantity < 0) product.quantity = 0;

        product.isShortcoming = product.quantity < 5 && product.unit === "علبة";

        await product.save();

        const itemTotal = quantityToDecrement * product.price;
        totalCost += itemTotal;

        detailedItems.push({
          name: productName,
          unit,
          quantity,
          price: product.price,
          total: itemTotal,
          fullProduct: product,
        });

        reasonParts.push(`${quantity} ${unit} ${productName}`);
      }
    }

    const order = {
      items: detailedItems,
      total: totalCost,
    };

    let debtor = await Debtor.findOne({ name });
    if (debtor) {
      debtor.orders.push(order);
      await debtor.save();
    } else {
      debtor = await Debtor.create({ name, orders: [order] });
    }

    await winningModel.create({
      amount: totalCost,
      reason: type === "agel"
        ? `تم إيداع ${reasonParts.join(" و ")} في حساب ${name}`
        : `تم شراء ${reasonParts.join(" و ")} للعميل ${name}`,
      transactionType: "suspended",
    });

    return NextResponse.json({ message: "تم تحديث المديونية", data: debtor }, { status: 201 });

  } catch (error) {
    console.error("POST /api/debt error:", error);
    return NextResponse.json({ message: "فشل في حفظ المديونية" }, { status: 500 });
  }
}



// ⬇️ جلب جميع المديونيات
export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const all = await Debtor.find({});
    return NextResponse.json(all, { status: 200 });

  } catch (error) {
    console.error("GET /api/debt error:", error);
    return NextResponse.json({ message: "فشل في جلب المديونيات" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { name, paidItems } = body;

    if (!name || !Array.isArray(paidItems)) {
      return NextResponse.json({ message: "الاسم والعناصر المدفوعة مطلوبة" }, { status: 400 });
    }

    const debtor = await Debtor.findOne({ name });
    if (!debtor) {
      return NextResponse.json({ message: "المدين غير موجود" }, { status: 404 });
    }

    let totalPaid = 0;
    const winningEntries = [];

    for (const { orderIndex, itemIndex, type } of paidItems) {
      if (type === "agel") {
        const agelAmount = debtor.agel || 0;
        if (agelAmount > 0) {
          totalPaid += agelAmount;

          // log the repayment
          winningEntries.push({
            amount: agelAmount,
            reason: `تم دفع إيداع بقيمة ${agelAmount} للعميل ${name}`,
            transactionType: "in",
          });

          // remove suspended agel record
          await winningModel.deleteOne({
            reason: `تم إيداع مال من نوع آجل للعميل ${name}`,
            transactionType: "suspended",
          });

          // remove agel field
          debtor.agel = 0;
        }

        continue;
      }

      const item = debtor.orders?.[orderIndex]?.items?.[itemIndex];
      if (!item) continue;

      const { name: itemName, quantity, price, unit } = item;
      const itemTotal = quantity * price;
      totalPaid += itemTotal;

      winningEntries.push({
        amount: itemTotal,
        reason: `تم دفع دين ${quantity} ${unit || ''} ${itemName} من ${name}`,
        transactionType: "in",
      });

      await winningModel.deleteOne({
        reason: `تم شراء ${quantity} ${unit || ''} ${itemName} للعميل ${name}`,
        transactionType: "suspended",
      });

      debtor.orders[orderIndex].items.splice(itemIndex, 1);
    }

    // clean empty orders
    debtor.orders = debtor.orders.filter(order => order.items.length > 0);

    if ((debtor.orders.length === 0) && !debtor.agel) {
      await Debtor.deleteOne({ _id: debtor._id });
    } else {
      await debtor.save();
    }

    if (winningEntries.length > 0) {
      await winningModel.insertMany(winningEntries);
    }

    return NextResponse.json({ message: "تم الدفع وتحديث الأرباح", totalPaid }, { status: 200 });

  } catch (error) {
    console.error("PATCH /api/debt error:", error);
    return NextResponse.json({ message: "فشل في تحديث الديون" }, { status: 500 });
  }
}

