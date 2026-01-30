import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { getWinningModel } from "@/app/lib/models/Winning";

export async function POST(req) {
    try {
        const user = verifyToken(req.headers);
        if (!user) return NextResponse.json({ success: false }, { status: 401 });

        if (user.role !== 'master') {
            return NextResponse.json(
                { success: false, message: "غير مسموح. هذه العملية للمصرح لهم فقط (Master)." },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { employeeName, totalAmount, reason, fundingSources } = body;

        // fundingSources: [{ pharmacyId: "1", amount: 100 }, { pharmacyId: "2", amount: 200 }]

        if (!fundingSources || !Array.isArray(fundingSources)) {
            return NextResponse.json({ success: false, message: "مصادر التمويل مطلوبة" }, { status: 400 });
        }

        const results = [];

        for (const source of fundingSources) {
            const conn = await getDb(source.pharmacyId);
            const Winning = getWinningModel(conn);

            const transaction = await Winning.create({
                amount: source.amount,
                reason: `دفع مرتب/مكافأة لـ ${employeeName}: ${reason} (تم الدفع من صيدلية ${source.pharmacyId})`,
                transactionType: 'out',
                date: new Date()
            });
            results.push({ pharmacyId: source.pharmacyId, id: transaction._id });
        }

        return NextResponse.json({
            success: true,
            message: `تم تسجيل دفع ${totalAmount} ج.م لـ ${employeeName} بنجاح`,
            results
        });

    } catch (error) {
        console.error("Salaries POST Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
