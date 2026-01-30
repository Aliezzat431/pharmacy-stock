import { getDb } from "@/app/lib/db";
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/verifyToken";
import { getSetting } from "@/app/lib/getSetting";
import { getProductModel } from "@/app/lib/models/Product";
import { getWinningModel } from "@/app/lib/models/Winning";

export async function POST(req) {
  let session;

  try {
    const user = verifyToken(req.headers);
    if (!user)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);
    const Winning = getWinningModel(conn);

    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "يجب إرسال عناصر" }, { status: 400 });
    }

    // --- 15-DAY RETURN VALIDATION ---
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    // Fetch all sales for the last 15 days
    const recentSales = await Winning.find({
      transactionType: "in",
      date: { $gte: fifteenDaysAgo },
    }).lean();

    // Verify each item was sold in the last 15 days
    for (const item of items) {
      const { name } = item;
      const wasSoldRecently = recentSales.some((sale) =>
        sale.reason.includes(name)
      );

      if (!wasSoldRecently) {
        return NextResponse.json(
          { error: `عذراً، المنتج "${name}" لم يتم بيعه خلال آخر 15 يوم، لذا لا يمكن عمل مرتجع له.` },
          { status: 400 }
        );
      }
    }
    // --------------------------------

    const now = new Date();
    const expiredItems = [];
    const notFound = [];
    let totalReturnCost = 0;
    const reasons = [];

    const threshold = Number(await getSetting(conn, "lowStockThreshold", 5));

    session = await conn.startSession();
    session.startTransaction();

    try {
      for (const item of items) {
        const { name, unit, quantity } = item;

        if (!name || !unit || quantity == null) {
          throw new Error("كل العناصر لازم تحتوي على name و unit و quantity");
        }

        const parsedQuantity = Number(quantity);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
          throw new Error(`الكمية غير صحيحة للمنتج: ${name}`);
        }

        const product = await Product.findOne({ name }).session(session);
        if (!product) {
          notFound.push(name);
          continue;
        }

        // التأكد من الوحدة
        if (!product.unitOptions || !product.unitOptions.includes(unit)) {
          throw new Error(`الوحدة "${unit}" غير متاحة للمنتج "${name}"`);
        }

        // التأكد من صلاحية المنتج
        if (product.expiryDate && new Date(product.expiryDate) < now) {
          expiredItems.push(name);
          continue;
        }

        if (product.purchasePrice == null) {
          throw new Error(
            `المنتج "${product.name}" لا يحتوي على سعر شراء (purchasePrice)`
          );
        }

        // تحويل الكمية حسب الوحدة
        let quantityToIncrement = parsedQuantity;

        if (unit !== product.unit) {
          if (!product.unitConversion) {
            throw new Error(`المنتج "${name}" لا يدعم تحويل الوحدة "${unit}"`);
          }
          quantityToIncrement = parsedQuantity / product.unitConversion;
        }

        if (!Number.isFinite(quantityToIncrement) || quantityToIncrement <= 0) {
          throw new Error(`الكمية بعد التحويل غير صحيحة للمنتج "${name}"`);
        }

        // ضمان إن الكمية رقم
        product.quantity = Number(product.quantity) || 0;

        const cost = quantityToIncrement * product.purchasePrice;
        totalReturnCost += cost;

        product.quantity += quantityToIncrement;
        product.isShortcoming = product.quantity < threshold;

        await product.save({ session });

        reasons.push(`${parsedQuantity} ${unit} ${product.name}`);
      }

      // لو في منتجات غير موجودة
      if (notFound.length > 0) {
        throw new Error(`بعض المنتجات غير موجودة: ${notFound.join(", ")}`);
      }

      // لو في منتجات منتهية
      if (expiredItems.length > 0) {
        throw new Error(
          `بعض المنتجات منتهية الصلاحية: ${expiredItems.join(", ")}`
        );
      }

      // تسجيل المصروف
      if (totalReturnCost > 0) {
        await Winning.create(
          [
            {
              amount: totalReturnCost,
              reason: `تم عمل مرتجع لـ ${reasons.join(" و ")}`,
              transactionType: "out",
              date: new Date(),
            },
          ],
          { session }
        );
      }

      await session.commitTransaction();

      return NextResponse.json(
        {
          message:
            "✅ تم حفظ المرتجع وتحديث الكمية وتسجيل المصروف بنجاح",
        },
        { status: 201 }
      );
    } catch (innerError) {
      await session.abortTransaction();
      return NextResponse.json({ error: innerError.message }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/returns error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء الحفظ" },
      { status: 500 }
    );
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch (e) {
        console.warn("Failed to end session:", e);
      }
    }
  }
}
