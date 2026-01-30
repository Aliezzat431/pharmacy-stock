import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { getWinningModel } from "@/app/lib/models/Winning";

export async function POST(req) {
    try {
        const user = verifyToken(req.headers);
        if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

        if (user.role !== 'master') {
            return NextResponse.json(
                { success: false, message: "غير مسموح. هذه العملية للمصرح لهم فقط (Master)." },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { amount, reason, pharmacyId } = body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return NextResponse.json({ success: false, message: "المبلغ غير صحيح" }, { status: 400 });
        }

        if (!reason) {
            return NextResponse.json({ success: false, message: "السبب مطلوب" }, { status: 400 });
        }

        const targetPharmacyId = pharmacyId || user.pharmacyId;
        const conn = await getDb(targetPharmacyId);
        const Winning = getWinningModel(conn);

        const transaction = await Winning.create({
            amount: Number(amount),
            reason: `سحب مدير: ${reason}`,
            transactionType: 'withdrawal',
            date: new Date()
        });

        return NextResponse.json({
            success: true,
            message: `تم تسجيل سحب ${amount} ج.م بنجاح`,
            id: transaction._id
        });

    } catch (error) {
        console.error("Withdrawal POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
