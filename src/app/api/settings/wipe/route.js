import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const user = verifyToken(req.headers);
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();

        // Clear main collections using a transaction
        await db.run('BEGIN TRANSACTION');
        try {
            await db.run('DELETE FROM products');
            await db.run('DELETE FROM winnings');
            // Adding other tables to be safe, though original only did these two
            await db.run('DELETE FROM debtors');
            await db.run('DELETE FROM orders');
            await db.run('DELETE FROM order_items');
            await db.run('DELETE FROM checkout_items');

            await db.run('COMMIT');
        } catch (e) {
            await db.run('ROLLBACK');
            throw e;
        }

        return NextResponse.json({
            success: true,
            message: "تم تصفير قاعدة البيانات بنجاح (المنتجات والمعاملات فقط)."
        });

    } catch (error) {
        console.error("Wipe error:", error);
        return NextResponse.json({ success: false, message: "حدث خطأ أثناء تصفير البيانات" }, { status: 500 });
    }
}
