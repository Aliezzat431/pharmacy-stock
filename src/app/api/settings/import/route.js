import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { getProductModel } from "@/app/lib/models/Product";
import { getWinningModel } from "@/app/lib/models/Winning";

export async function POST(req) {
  let session;

  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { products, winnings } = await req.json();

    if (!Array.isArray(products) || !Array.isArray(winnings)) {
      return NextResponse.json({ success: false, message: "Invalid data format" }, { status: 400 });
    }

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);
    const Winning = getWinningModel(conn);

    session = await conn.startSession();
    session.startTransaction();

    try {
      // Clear existing data
      await Product.deleteMany({}, { session });
      await Winning.deleteMany({}, { session });

      // Insert products
      for (const p of products) {
        const { _id, createdAt, updatedAt, ...rest } = p;

        if (!rest.name || !rest.type) {
          throw new Error("Missing required fields in products (name/type).");
        }

        await Product.create([rest], { session });
      }

      // Insert winnings
      let cleanedWinnings = [];
      winnings.forEach(({ _id, ...rest }) => {
        if (!rest.transactionType && Array.isArray(rest.orders)) {
          rest.orders.forEach(order => {
            cleanedWinnings.push({
              amount: order.amount,
              reason: order.reason,
              transactionType: order.type || "in",
              date: rest.date || new Date()
            });
          });
        } else {
          cleanedWinnings.push(rest);
        }
      });

      for (const w of cleanedWinnings) {
        if (w.amount == null || !w.transactionType) {
          throw new Error("Missing fields in winnings data.");
        }
        await Winning.create([w], { session });
      }

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({
        success: true,
        message: `تم استعادة البيانات بنجاح: ${products.length} منتج، ${cleanedWinnings.length} عملية.`,
      });

    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }

  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { success: false, message: `حدث خطأ أثناء استيراد البيانات: ${error.message}` },
      { status: 500 }
    );
  }
}
