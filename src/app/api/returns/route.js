import { connectDB } from "@/app/lib/connectDb";
import Product from "@/app/models/product.model";
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/verifyToken";
import winningModel from "@/app/models/winning.model";

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
      const { name, unit, quantity } = item;

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

      let quantityToIncrement = quantity;
      if (unit !== product.unit && product.unitConversion) {
        quantityToIncrement = quantity / product.unitConversion;
      }

      const cost = quantityToIncrement * (product.purchasePrice || 0);
      totalCost += cost;

      product.quantity += quantityToIncrement;

      await Product.updateOne(
        { _id: product._id },
        { quantity: product.quantity }
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
        reason: `تم عمل مرتجع لـ ${reasons.join(" و ")}`,
        transactionType: "out",
        date: now,
      });
    }

    return NextResponse.json({
      message: "✅ تم حفظ المرتجع وتحديث الكمية وتسجيل المصروف بنجاح",
    }, { status: 201 });

  } catch (error) {
    console.error("POST /api/returns error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء الحفظ" }, { status: 500 });
  }
}

// ✅ Helper function to map type to allowed units
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
"فوار":["كيس","علبة"]

};

function getUnitsForType(type) {
  return typesWithUnits[type] || ["علبة"];
}
