import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const db = await getDb(); // لازم يكون SQLite DB هنا
    const { searchParams } = new URL(req.url);
    const companyName = searchParams.get("name");

    if (!companyName || companyName.trim().length === 0) {
      return NextResponse.json(
        { error: "اسم الشركة مطلوب في الرابط (name query parameter)." },
        { status: 400 }
      );
    }

    // 1) Fetch products for this company
    const products = await db.all(
      "SELECT * FROM products WHERE company = ?",
      [companyName.trim()]
    );

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: "لا يوجد منتجات لهذه الشركة أو اسم الشركة غير صحيح." },
        { status: 404 }
      );
    }

    // 2) Fetch winning records for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const salesRecords = await db.all(
      "SELECT * FROM winnings WHERE date >= ? AND transactionType = 'in'",
      [thirtyDaysAgoStr]
    );

    const halfPeriod = new Date();
    halfPeriod.setDate(halfPeriod.getDate() - 15);

    // 3) Analyze each product
    const reportData = products.map((product) => {
      let firstHalfSales = 0;
      let secondHalfSales = 0;

      salesRecords.forEach((record) => {
        if (record.reason && record.reason.includes(product.name)) {
          const recordDate = new Date(record.date);

          if (recordDate >= halfPeriod) secondHalfSales++;
          else firstHalfSales++;
        }
      });

      let trend = "stable";
      if (secondHalfSales > firstHalfSales) trend = "increasing";
      if (secondHalfSales < firstHalfSales) trend = "decreasing";

      const updatedAt = new Date(product.updatedAt);
      const isShortLongTime =
        product.isShortcoming &&
        updatedAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      return {
        _id: product.id,
        name: product.name,
        quantity: product.quantity,
        isShortcoming: !!product.isShortcoming,
        unit: product.unit,
        salesCount: firstHalfSales + secondHalfSales,
        trend,
        isShortLongTime: !!isShortLongTime,
      };
    });

    return NextResponse.json({ products: reportData }, { status: 200 });
  } catch (error) {
    console.error("Company Report Error:", error);
    return NextResponse.json(
      { error: "فشل في توليد التقرير. تأكد من إعدادات DB والـ query parameters." },
      { status: 500 }
    );
  }
}
