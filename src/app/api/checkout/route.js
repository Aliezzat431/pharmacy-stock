import { getDb } from "@/app/lib/db";
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/verifyToken";
import { typesWithUnits } from "@/app/lib/unitOptions";
import { getSetting } from "@/app/lib/getSetting";
import { getProductModel } from "@/app/lib/models/Product";
import { getWinningModel } from "@/app/lib/models/Winning";

export async function GET(request) {
  try {
    const user = verifyToken(request.headers);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);

    const products = await Product.find({}).lean();

    const treatments = products.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      price: p.price,
      unit: p.unit,
      quantity: p.quantity,
      type: p.type,
      isShortcoming: !!p.isShortcoming,
      unitConversion: p.unitConversion,
      isBaseUnit: !!p.isBaseUnit,
      barcode: p.barcode,
      expiryDate: p.expiryDate,
      unitOptions: typesWithUnits[p.type] || ["علبة"],
    }));

    // Add "agel" non-product item
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
      unitOptions: ["جنيه"],
    });

    return NextResponse.json({ treatments }, { status: 200 });
  } catch (error) {
    console.error("GET /api/checkout error:", error);
    return NextResponse.json(
      { error: "خطأ في الخادم أثناء جلب المنتجات" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);
    const Winning = getWinningModel(conn);

    const body = await req.json();
    const items = body?.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "الطلب غير صالح أو لا يحتوي على منتجات" },
        { status: 400 }
      );
    }

    // Detect duplicates
    const ids = items.map((i) => i._id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      return NextResponse.json(
        { error: "لا يمكن تكرار نفس المنتج في نفس الطلب" },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiredItems = [];
    let totalSaleAmount = 0;
    const reasons = [];

    const session = await conn.startSession();
    session.startTransaction();

    try {
      for (const item of items) {
        const { _id, name, unit, quantity } = item;

        if (!_id || !name || !unit || quantity == null) {
          throw new Error(`البيانات ناقصة في أحد المنتجات`);
        }

        if (typeof quantity !== "number" || isNaN(quantity) || quantity <= 0) {
          throw new Error(`الكمية غير صالحة للمنتج "${name}"`);
        }

        // "agel" special case
        if (_id === "agel") {
          totalSaleAmount += quantity;
          reasons.push(`إيداع مبلغ ${quantity} جنيه`);
          continue;
        }

        const product = await Product.findById(_id).session(session);
        if (!product) {
          throw new Error(`المنتج "${name}" غير موجود`);
        }

        // Check expiry
        if (product.expiryDate && new Date(product.expiryDate) < now) {
          expiredItems.push(product.name);
          continue;
        }

        let qtyToDecrement = unit !== product.unit ? quantity / (product.unitConversion || 1) : quantity;

        if (qtyToDecrement > product.quantity) {
          throw new Error(
            `الكمية المطلوبة (${qtyToDecrement}) أكبر من المتوفرة (${product.quantity}) للمنتج "${product.name}"`
          );
        }

        totalSaleAmount += qtyToDecrement * (product.price || 0);

        product.quantity -= qtyToDecrement;
        const threshold = await getSetting(conn, "lowStockThreshold", 5);
        product.isShortcoming = product.quantity < threshold;

        await product.save({ session });
        reasons.push(`${quantity} ${unit} ${product.name}`);
      }

      if (expiredItems.length > 0) {
        throw new Error(`بعض المنتجات منتهية الصلاحية: ${expiredItems.join(", ")}`);
      }

      const isSadaqah = body.isSadaqah === true;

      // ✅ UPDATED HERE
      if (isSadaqah) {
        await Winning.create(
          [
            {
              amount: totalSaleAmount,
              reason: "صدقة: " + reasons.join(" و "),
              transactionType: "sadaqah",
              date: new Date(),
            },
          ],
          { session }
        );
      } else if (totalSaleAmount > 0) {
        await Winning.create(
          [
            {
              amount: totalSaleAmount,
              reason: reasons.join(" و "),
              transactionType: "in",
              date: new Date(),
            },
          ],
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json(
        {
          success: true,
          message: "تم حفظ الطلب وتحديث الكمية وتسجيل الدخل بنجاح",
          totalAmount: totalSaleAmount,
          itemsProcessed: items.length,
        },
        { status: 201 }
      );
    } catch (innerError) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ error: innerError.message }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/checkout error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء حفظ الطلب" },
      { status: 500 }
    );
  }
}
