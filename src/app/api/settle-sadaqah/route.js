import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { getWinningModel } from "@/app/lib/models/Winning";

export async function POST(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const Winning = getWinningModel(conn);

    // نجيب كل الصدقات اللي لسه مش مدفوعة
    const pending = await Winning.find({ transactionType: "sadaqah" });

    if (!pending.length) {
      return NextResponse.json({ success: false, message: "لا توجد صدقات غير مدفوعة الآن" });
    }

    const session = await conn.startSession();
    session.startTransaction();

    try {
      let totalPaid = 0;
      for (const item of pending) {
        totalPaid += item.amount;

        // نعمل entry جديدة كـ in باسم "تسديد صدقات"
        await Winning.create(
          [
            {
              amount: item.amount,
              reason: "تسديد صدقات",
              transactionType: "in",
              date: new Date(),
            },
          ],
          { session }
        );

        // نحذف القديم أو نغيره
        await Winning.updateOne(
          { _id: item._id },
          { $set: { transactionType: "sadaqahPaid", reason: "صدقة مدفوعة" } },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({ success: true, message: `تم تسديد ${totalPaid} ج.م كصدقات وتم تسجيلها كدخل.` });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, message: err.message });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "حدث خطأ" }, { status: 500 });
  }
}
