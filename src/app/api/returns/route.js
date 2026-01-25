import { getDb } from "@/app/lib/db";
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/verifyToken";
import { getSetting } from "@/app/lib/getSetting";
import { getProductModel } from "@/app/lib/models/Product";
import { getWinningModel } from "@/app/lib/models/Winning";

export async function POST(req) {
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

    const now = new Date();
    const expiredItems = [];
    let totalReturnCost = 0;
    const reasons = [];

    const session = await conn.startSession();
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
          console.warn(`المنتج "${name}" غير موجود`);
          continue;
        }

        if (product.expiryDate && new Date(product.expiryDate) < now) {
          expiredItems.push(name);
          continue;
        }

        if (product.purchasePrice == null) {
          throw new Error(
            `المنتج "${product.name}" لا يحتوي على سعر شراء (purchasePrice)`
          );
        }

        let quantityToIncrement = parsedQuantity;

        if (unit !== product.unit && product.unitConversion) {
          quantityToIncrement = parsedQuantity / product.unitConversion;
        }

        const cost = quantityToIncrement * product.purchasePrice;
        totalReturnCost += cost;

        product.quantity += quantityToIncrement;

        const threshold = Number(
          await getSetting(conn, "lowStockThreshold", 5)
        );
        product.isShortcoming = product.quantity < threshold;

        await product.save({ session });

        reasons.push(`${parsedQuantity} ${unit} ${product.name}`);
      }

      if (expiredItems.length > 0) {
        throw new Error(
          `بعض المنتجات منتهية الصلاحية: ${expiredItems.join(", ")}`
        );
      }

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
      session.endSession();

      return NextResponse.json(
        {
          message:
            "✅ تم حفظ المرتجع وتحديث الكمية وتسجيل المصروف بنجاح",
        },
        { status: 201 }
      );
    } catch (innerError) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ error: innerError.message }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/returns error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء الحفظ" },
      { status: 500 }
    );
  }
}
