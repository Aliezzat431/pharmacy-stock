import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { getProductModel } from "@/app/lib/models/Product";
import { getWinningModel } from "@/app/lib/models/Winning";
import { getOrderModel } from "@/app/lib/models/Order";
import { getDebtorModel } from "@/app/lib/models/Order";

export async function POST(req) {
  let session;

  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const conn = await getDb(user.pharmacyId);

    const Product = getProductModel(conn);
    const Winning = getWinningModel(conn);
    const Order = getOrderModel(conn);
    const Debtor = getDebtorModel(conn);

    session = await conn.startSession();
    session.startTransaction();

    await Product.deleteMany({}, { session });
    await Winning.deleteMany({}, { session });
    await Order.deleteMany({}, { session });
    await Debtor.deleteMany({}, { session });

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({
      success: true,
      message: "تم تصفير قاعدة البيانات بنجاح (الموديلات المحددة).",
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

    console.error("Wipe error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ أثناء تصفير البيانات" },
      { status: 500 }
    );
  }
}
