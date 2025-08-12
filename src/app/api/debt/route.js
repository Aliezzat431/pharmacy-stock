import { connectDB } from "@/app/lib/connectDb";
import Debtor from "@/app/models/debtor.model";
import Product from "@/app/models/product.model";
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/verifyToken";
import { typesWithUnits } from "@/app/lib/unitOptions";
import winningModel from "@/app/models/winning.model";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const products = body.orders;
    const payAmount = body.partialPayment || 0;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'يجب إرسال قائمة منتجات صحيحة (مصفوفة غير فارغة).' }, { status: 400 });
    }

    const createdProducts = [];
    let totalAmount = 0;
    const reasonParts = [];

    for (const productData of products) {
      const {
        name,
        unit,
        quantity,
        fullProduct,
        price,
        expiry,
        remaining,
        unitOptions = []
      } = productData;

      const parsedQuantity = Number(quantity);
      const normalizedUnit = typeof unit === "string" ? unit : unit?.value || "";

      if (!name || !normalizedUnit || parsedQuantity === undefined) {
        return NextResponse.json({ error: 'يجب توفير الاسم والوحدة والكمية على الأقل لكل منتج' }, { status: 400 });
      }

      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return NextResponse.json({ error: 'الكمية يجب أن تكون رقمًا موجبًا' }, { status: 400 });
      }

      const usedPrice = price || (fullProduct?.price ?? 0);
      const itemTotal = usedPrice * parsedQuantity;

      const normalizedUnitOptions = unitOptions
        .map(opt => typeof opt === "string" ? opt : opt?.value || "")
        .filter(Boolean);

      createdProducts.push({
        name,
        price: usedPrice,
        quantity: parsedQuantity,
        unit: normalizedUnit,
        total: itemTotal,
        unitOptions: normalizedUnitOptions,
        expiryDate: expiry || fullProduct?.expiryDate || null,
        remaining: remaining || fullProduct?.quantity || 0,
        fullProduct: {
          ...fullProduct,
          quantity: fullProduct?.quantity ?? 0,
        }
      });

      // ✅ تجاهل تعديل المخزون إذا كان المنتج agel
      const isAgel = fullProduct?._id === "agel" || fullProduct?.type === "agel";
      if (!isAgel) {
        const baseUnit = fullProduct?.unit;
        const unitConversion = fullProduct?.unitConversion ?? 1;
        let decrementAmount = parsedQuantity;

        if (normalizedUnit !== baseUnit && unitConversion > 0) {
          decrementAmount = parsedQuantity / unitConversion;
        }

        const newQty = (fullProduct?.quantity ?? 0) - decrementAmount;

        // ✅ تأكد أن _id صالح قبل استخدامه مع MongoDB
        if (mongoose.Types.ObjectId.isValid(fullProduct._id)) {
          await Product.findByIdAndUpdate(fullProduct._id, { quantity: newQty });
        }
      }

      const cost = fullProduct?.purchasePrice ?? usedPrice;
      totalAmount += cost * parsedQuantity;
      reasonParts.push(`${parsedQuantity} ${normalizedUnit} ${name}`);
    }

    if (payAmount > totalAmount) {
      return NextResponse.json({ error: 'المبلغ المدفوع لا يمكن أن يكون أكبر من إجمالي الدين.' }, { status: 400 });
    }

    let debtor = await Debtor.findOne({ name: body.name });
    if (!debtor) {
      debtor = new Debtor({ name: body.name, orders: [], partialPayments: 0 });
    }

    debtor.orders.push({ items: createdProducts, total: totalAmount });

    if (payAmount > 0) {
      debtor.partialPayments += payAmount;

      await winningModel.create({
        amount: payAmount,
        reason: `دفع جزئي عند تسجيل دين للعميل ${body.name} عن ${reasonParts.join(' + ')}`,
        transactionType: "in",
      });
    } else {
      await winningModel.create({
        amount: totalAmount,
        reason: `تم إيداع مال من منتج غير محدد للعميل ${body.name}`,
        transactionType: "suspended",
      });
    }

    const newTotalDebt = debtor.orders.reduce(
      (sum, order) =>
        sum + order.items.reduce((acc, item) => acc + item.quantity * item.price, 0),
      0
    );
    const isFullyPaid = debtor.partialPayments >= newTotalDebt;

    if (isFullyPaid) {
      await Debtor.deleteOne({ _id: debtor._id });
    } else {
      await debtor.save();
    }

    return NextResponse.json({
      success: true,
      createdProducts,
      totalAmount,
      paidAmount: payAmount,
      remainingAmount: totalAmount - payAmount,
      reason: reasonParts.join(' + '),
    });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}








export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const allDebtors = await Debtor.find({}).lean(); // lean() to get plain objects

    const enrichedDebtors = allDebtors.map((debtor) => {
      const ordersTotal = debtor.orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      const paid = debtor.partialPayments || 0;
      const totalDebt = ordersTotal - paid;

      return {
        ...debtor,
        totalDebt,
        totalOrders: ordersTotal,
        paid,
      };
    });

    return NextResponse.json(enrichedDebtors, { status: 200 });

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
    const { name, payAmount } = body;

    if (!name || typeof payAmount !== "number" || payAmount <= 0) {
      return NextResponse.json({ message: "الاسم ومبلغ الدفع مطلوب" }, { status: 400 });
    }

    const debtor = await Debtor.findOne({ name });
    if (!debtor) {
      return NextResponse.json({ message: "المدين غير موجود" }, { status: 404 });
    }

    let totalPaid = 0;
    let remaining = payAmount;
    const winningEntries = [];

    // إذا كان هناك آجل يتم دفعه أولاً
    if (debtor.agel && debtor.agel > 0) {
      const agelToPay = Math.min(remaining, debtor.agel);
      remaining -= agelToPay;
      totalPaid += agelToPay;

      winningEntries.push({
        amount: agelToPay,
        reason: `تم دفع إيداع بقيمة ${agelToPay} للعميل ${name}`,
        transactionType: "in",
      });

      // حذف معاملة الآجل المعلقة
      await winningModel.deleteOne({
        reason: `تم إيداع مال من نوع آجل للعميل ${name}`,
        transactionType: "suspended",
      });

      debtor.agel -= agelToPay;
    }

    // إذا بقي مبلغ ولم يتم إكمال الدفع، يتم خصم الباقي من المعاملات المعلقة
    if (remaining > 0) {
      const suspendedTransactions = await winningModel
        .find({
          transactionType: "suspended",
          reason: { $regex: `.*${name}.*` },
        })
        .sort({ createdAt: 1 });

      for (const tx of suspendedTransactions) {
        if (remaining <= 0) break;

        const deductAmount = Math.min(tx.amount, remaining);
        remaining -= deductAmount;
        totalPaid += deductAmount;

        winningEntries.push({
          amount: deductAmount,
          reason: `تم خصم ${deductAmount} من المعاملة المعلقة للعميل ${name}`,
          transactionType: "in",
        });

        if (deductAmount === tx.amount) {
          // حذف المعاملة بالكامل
          await winningModel.deleteOne({ _id: tx._id });
        } else {
          // تقليل قيمة المعاملة
          await winningModel.updateOne({ _id: tx._id }, { $inc: { amount: -deductAmount } });
        }
      }
    }

    // حساب ديون المنتجات
    const totalDebt = debtor.orders.reduce((sum, order) => {
      return sum + order.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
    }, 0);

    if (remaining > 0 && totalDebt > 0) {
      const partialPayment = Math.min(remaining, totalDebt);
      remaining -= partialPayment;
      totalPaid += partialPayment;

      winningEntries.push({
        amount: partialPayment,
        reason: `تم دفع ${partialPayment} من ديون المنتجات للعميل ${name}`,
        transactionType: "in",
      });

      debtor.partialPayments = (debtor.partialPayments || 0) + partialPayment;
    }

    // التحقق من السداد الكامل
    const isFullyPaid =
      (debtor.agel <= 0 || !debtor.agel) &&
      (debtor.partialPayments >= totalDebt);

    if (isFullyPaid) {
      await Debtor.deleteOne({ _id: debtor._id });

      await winningModel.deleteMany({
        transactionType: "suspended",
        reason: { $regex: `.*${name}.*` },
      });
    } else {
      await debtor.save();
    }

    if (winningEntries.length > 0) {
      await winningModel.insertMany(winningEntries);
    }

    return NextResponse.json({ message: "تم الدفع وتسجيل الخصم", totalPaid }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/debt error:", error);
    return NextResponse.json({ message: "فشل في تحديث الديون" }, { status: 500 });
  }
}




 

