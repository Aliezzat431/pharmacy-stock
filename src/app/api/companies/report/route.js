import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const user = verifyToken(req.headers);
        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const db = await getDb();
        const { searchParams } = new URL(req.url);
        const companyName = searchParams.get("name");

        if (!companyName) {
            return NextResponse.json({ error: "اسم الشركة مطلوب" }, { status: 400 });
        }

        // 1. Fetch all products for this company
        const products = await db.all('SELECT * FROM products WHERE company = ?', [companyName]);

        // 2. Fetch winning records for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

        const salesRecords = await db.all(
            "SELECT * FROM winnings WHERE date >= ? AND transactionType = 'in'",
            [thirtyDaysAgoStr]
        );

        const halfPeriod = new Date();
        halfPeriod.setDate(halfPeriod.getDate() - 15);

        // 3. Analyze each product
        const reportData = products.map(product => {
            let firstHalfSales = 0;
            let secondHalfSales = 0;

            salesRecords.forEach(record => {
                if (record.reason.includes(product.name)) {
                    const recordDate = new Date(record.date);
                    if (recordDate >= halfPeriod) {
                        secondHalfSales++;
                    } else {
                        firstHalfSales++;
                    }
                }
            });

            let trend = "stable";
            if (secondHalfSales > firstHalfSales) trend = "increasing";
            if (secondHalfSales < firstHalfSales) trend = "decreasing";

            const isShortLongTime = product.isShortcoming &&
                new Date(product.updatedAt) < (new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

            return {
                _id: product.id,
                name: product.name,
                quantity: product.quantity,
                isShortcoming: !!product.isShortcoming,
                unit: product.unit,
                salesCount: firstHalfSales + secondHalfSales,
                trend,
                isShortLongTime: !!isShortLongTime
            };
        });

        return NextResponse.json({ products: reportData });
    } catch (error) {
        console.error("Company Report Error:", error);
        return NextResponse.json({ error: "فشل في توليد التقرير" }, { status: 500 });
    }
}
