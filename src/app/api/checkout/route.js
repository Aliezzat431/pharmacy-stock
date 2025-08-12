import { connectDB } from "@/app/lib/connectDb";
import Product from "@/app/models/product.model";
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/verifyToken";
import winningModel from "@/app/models/winning.model";
import { typesWithUnits } from "@/app/lib/unitOptions";

export async function GET(request) {
  try {
    const user = verifyToken(request.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const products = await Product.find({});

    const treatments = products.map((p) => {
      const obj = p.toObject();
      return {
        _id: obj._id,
        name: obj.name,
        price: obj.price,
        unit: obj.unit,
        quantity: obj.quantity,
        type: obj.type,
        isShortcoming: obj.isShortcoming,
        unitConversion: obj.unitConversion,
        isBaseUnit: obj.isBaseUnit,
        barcode: obj.barcode,
        expiryDate: obj.expiryDate,
        unitOptions: getUnitsForType(obj.type),
      };
    });

    // Add "agel" (non-product item)
    treatments.push({
      _id: "agel",
      name: "إيداع مال من منتج غير محدد",
      price: 1,
      unit: "جنيه",
      quantity: 100,
      type: "agel",
      isShortcoming: false,
      unitConversion: null,
      isBaseUnit: true,
      barcode: "",
      expiryDate: null,
      unitOptions: [{ value: "جنيه", label: "جنيه" }],
    });

    return NextResponse.json({ treatments }, { status: 200 });
  } catch (error) {
    console.error("GET /api/checkout error:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();

    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json({ error: "الطلب غير صالح" }, { status: 400 });
    }

    const items = body.items;
    if (items.length === 0) {
      return NextResponse.json({ error: "يجب إدخال منتجات" }, { status: 400 });
    }

    const ids = items.map(i => i._id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      return NextResponse.json({ error: "لا يمكن تكرار نفس المنتج في نفس الطلب" }, { status: 400 });
    }

    const now = new Date();
    const expiredItems = [];
    let totalCost = 0;
    const reasons = [];

    for (const item of items) {
      const { _id, name, unit, quantity } = item;

      if (!_id || !name || !unit || quantity == null) {
        return NextResponse.json({ error: `البيانات ناقصة في أحد العناصر` }, { status: 400 });
      }

      if (typeof quantity !== "number" || isNaN(quantity) || quantity <= 0) {
        return NextResponse.json({ error: `الكمية غير صالحة للمنتج "${name}"` }, { status: 400 });
      }

      // Handle "agel" deposit case
      if (_id === "agel") {
        const depositAmount = parseFloat(quantity);
        if (isNaN(depositAmount) || depositAmount <= 0) {
          return NextResponse.json({ error: "قيمة المبلغ غير صالحة" }, { status: 400 });
        }
        totalCost += depositAmount;
        reasons.push(`إيداع مبلغ ${depositAmount} جنيه`);
        continue;
      }

      const product = await Product.findOne({ _id });

      if (!product) {
        return NextResponse.json({ error: `المنتج "${name}" غير موجود` }, { status: 404 });
      }

      // Validate product data before sale
      if (product.quantity == null || isNaN(product.quantity) || product.quantity < 0) {
        return NextResponse.json({ error: `كمية المنتج "${product.name}" غير صالحة في قاعدة البيانات` }, { status: 400 });
      }

      if (product.purchasePrice == null || isNaN(product.purchasePrice) || product.purchasePrice <= 0) {
        return NextResponse.json({ error: `المنتج "${product.name}" لا يحتوي على سعر شراء صالح` }, { status: 400 });
      }

      if (product.price == null || isNaN(product.price) || product.price < 0) {
        return NextResponse.json({ error: `المنتج "${product.name}" لا يحتوي على سعر بيع صالح` }, { status: 400 });
      }

      // Check expiry
      if (product.expiryDate && !isNaN(new Date(product.expiryDate)) && new Date(product.expiryDate) < now) {
        expiredItems.push(name);
        continue;
      }

      // Handle unit conversion
      let quantityToDecrement = quantity;
      const isDifferentUnit = unit !== product.unit;
      const conversion = typeof product.unitConversion === "number" ? product.unitConversion : 1;

      if (isDifferentUnit) {
        if (!conversion || isNaN(conversion) || conversion <= 0) {
          return NextResponse.json({ error: `لا يمكن تحويل الوحدة "${unit}" للمنتج "${name}"` }, { status: 400 });
        }
        quantityToDecrement = quantity / conversion;
      }

      // Prevent selling more than available stock
      if (quantityToDecrement > product.quantity) {
        return NextResponse.json({
          error: `الكمية المطلوبة (${quantityToDecrement}) أكبر من المتوفرة (${product.quantity}) للمنتج "${product.name}"`,
        }, { status: 400 });
      }

      const cost = quantityToDecrement * (product.price || 0);
      totalCost += cost;

      let newQuantity = product.quantity - quantityToDecrement;
      if (newQuantity < 0) newQuantity = 0;

      const isShortcoming = newQuantity < 5;

      await Product.updateOne(
        { _id: product._id },
        { quantity: newQuantity, isShortcoming }
      );

      reasons.push(`${quantity} ${unit} ${product.name}`);
    }

    if (expiredItems.length > 0) {
      return NextResponse.json({
        success: false,
        message: "بعض المنتجات منتهية الصلاحية",
        expired: expiredItems,
      }, { status: 400 });
    }

    if (totalCost > 0) {
      await winningModel.create({
        amount: totalCost,
        reason: reasons.join(" و "),
        transactionType: "in",
        date: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: "تم حفظ الطلب وتحديث الكمية وتسجيل الدخل بنجاح",
    }, { status: 201 });

  } catch (error) {
    console.error("POST /api/checkout error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء الحفظ" }, { status: 500 });
  }
}




function getUnitsForType(type) {
  return typesWithUnits[type] || ["علبة"];
}
