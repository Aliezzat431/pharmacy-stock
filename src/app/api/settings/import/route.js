import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const user = verifyToken(req.headers);
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { products, winnings } = await req.json();

        if (!Array.isArray(products) || !Array.isArray(winnings)) {
            return NextResponse.json({ success: false, message: "Invalid data format" }, { status: 400 });
        }

        const db = await getDb();

        await db.run('BEGIN TRANSACTION');
        try {
            await db.run('DELETE FROM products');
            await db.run('DELETE FROM winnings');

            for (const p of products) {
                const { _id, createdAt, updatedAt, ...rest } = p;
                await db.run(
                    `INSERT INTO products (
                        name, type, unit, quantity, price, purchasePrice, unitConversion, isBaseUnit, 
                        barcode, barcodes, expiryDate, unitOptions, isShortcoming, company, details
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        rest.name, rest.type, rest.unit, rest.quantity, rest.price, rest.purchasePrice,
                        rest.unitConversion, rest.isBaseUnit ? 1 : 0, rest.barcode,
                        JSON.stringify(rest.barcodes || []), rest.expiryDate,
                        JSON.stringify(rest.unitOptions || []), rest.isShortcoming ? 1 : 0,
                        rest.company, rest.details || ""
                    ]
                );
            }

            let cleanedWinnings = [];
            winnings.forEach(({ _id, ...rest }) => {
                if (!rest.transactionType && Array.isArray(rest.orders)) {
                    rest.orders.forEach(order => {
                        cleanedWinnings.push({
                            amount: order.amount,
                            reason: order.reason,
                            transactionType: order.type || "in",
                            date: rest.date || new Date().toISOString()
                        });
                    });
                } else {
                    cleanedWinnings.push(rest);
                }
            });

            for (const w of cleanedWinnings) {
                await db.run(
                    'INSERT INTO winnings (amount, reason, transactionType, date) VALUES (?, ?, ?, ?)',
                    [w.amount, w.reason, w.transactionType, w.date]
                );
            }

            await db.run('COMMIT');
        } catch (e) {
            await db.run('ROLLBACK');
            throw e;
        }

        return NextResponse.json({
            success: true,
            message: `تم استعادة البيانات بنجاح: ${products.length} منتج، ${winnings.length} عملية.`
        });

    } catch (error) {
        console.error("Import error:", error);
        return NextResponse.json({ success: false, message: `حدث خطأ أثناء استيراد البيانات: ${error.message}` }, { status: 500 });
    }
}
