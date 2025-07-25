import { connectDB } from "@/app/lib/connectDb";
import Product from "@/app/models/product.model";
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/verifyToken";
import winningModel from "@/app/models/winning.model";

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

    // Add agel entry manually
    treatments.push({
      _id: "agel",
      name: "إيداع مال من منتج غير محدد",
      price: 0,
      unit: "جنيه",
      quantity: 0,
      type: "agel",
      isShortcoming: false,
      unitConversion: null,
      isBaseUnit: true,
      barcode: "",
      expiryDate: null,
      unitOptions: ["جنيه"],
    });

    return NextResponse.json({ treatments }, { status: 200 });
  } catch (error) {
    console.error("GET /api/checkout error:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}


// POST: Handle sale and update quantities
export async function POST(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "يجب إرسال عناصر" }, { status: 400 });
    }

    const now = new Date();
    const expiredItems = [];
    let totalCost = 0;
    const reasons = [];

    for (const item of items) {
    const { _id, name, unit, quantity } = item;

if (_id === "agel") {

        const depositAmount = parseFloat(quantity);
        if (isNaN(depositAmount) || depositAmount <= 0) {
          return NextResponse.json({ error: "قيمة المبلغ غير صالحة" }, { status: 400 });
        }

        totalCost += depositAmount;
        console.log(`إيداع مبلغ ${depositAmount} جنيه`);
        
        reasons.push(`إيداع مبلغ ${depositAmount} جنيه`);
        continue;
      }

      const product = await Product.findOne({ name });
      if (!product) {
        console.warn(`المنتج "${name}" غير موجود`);
        continue;
      }

      if (product.expiryDate && new Date(product.expiryDate) < now) {
        expiredItems.push(name);
        continue;
      }

      if (product.purchasePrice == null) {
        return NextResponse.json({
          message: `المنتج "${product.name}" لا يحتوي على سعر شراء (purchasePrice)`,
        }, { status: 400 });
      }

      let quantityToDecrement = quantity;
      if (unit !== product.unit && product.unitConversion) {
        quantityToDecrement = quantity / product.unitConversion;
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
      message: "تم حفظ الطلب وتحديث الكمية وتسجيل الدخل بنجاح",
    }, { status: 201 });

  } catch (error) {
    console.error("POST /api/checkout error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء الحفظ" }, { status: 500 });
  }
}


// Units by product type
const typesWithUnits = {
  "مضاد حيوي شرب": ["علبة"],
  "مضاد حيوي برشام": ["شريط", "علبة"],
  "دواء عادي برشام": ["شريط", "علبة"],
  "فيتامين برشام": ["شريط", "علبة"],
  "فيتامين شرب": ["علبة"],
  "دواء شرب عادي": ["علبة"],
  "نقط فم": ["علبة"],
  "نقط أنف": ["علبة"],
  "بخاخ فم": ["علبة"],
  "بخاخ أنف": ["علبة"],
  "مرهم": ["علبة"],
  "مستحضرات": ["علبة"],
  "لبوس": ["شريط", "علبة"],
  "حقن": ["أمبول", "علبة"],  
  "فوار":["كيس","علبة"],
  "agel": ["مبلغ"] 
};

function getUnitsForType(type) {
  return typesWithUnits[type] || ["علبة"];
}
