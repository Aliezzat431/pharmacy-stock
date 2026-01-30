import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { getWinningModel } from "@/app/lib/models/Winning";

export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const conn = await getDb(user.pharmacyId);
    const Winning = getWinningModel(conn);

    // fetch pending sadaqah
    const pending = await Winning.find({ transactionType: "sadaqah" })
      .sort({ date: -1 })  // الأحدث أولًا (لو تحب الأقدم أولًا خليها 1)
      .lean();

    return NextResponse.json({
      success: true,
      pendingCount: pending.length,
      pending,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "حدث خطأ" }, { status: 500 });
  }
}
