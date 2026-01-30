import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { getWinningModel } from "@/app/lib/models/Winning";

export async function GET(req) {
    try {
        const user = verifyToken(req.headers);
        if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

        if (user.role !== 'master') {
            return NextResponse.json(
                { success: false, message: "غير مسموح. هذه البيانات للمدير فقط." },
                { status: 403 }
            );
        }

        // We need to fetch from ALL pharmacies or just the active one?
        // Usually, a master wants to see everything.
        // For simplicity, let's fetch from the user's current pharmacy context or iterate all.
        // Given the schemas, it seems we might need to check '1' and '2'. 
        // Let's default to the user's pharmacyId for now, or allow a query param.

        const pharmacyId = user.pharmacyId || '1'; // Default
        const conn = await getDb(pharmacyId);
        const Winning = getWinningModel(conn);

        // Fetch 'out' (expenses/salaries) and 'withdrawal' (manager pulls)
        const transactions = await Winning.find({
            transactionType: { $in: ['out', 'withdrawal'] }
        })
            .sort({ date: -1 })
            .limit(50); // Limit to last 50 for performance

        return NextResponse.json({
            success: true,
            transactions
        });

    } catch (error) {
        console.error("Payroll History GET Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
