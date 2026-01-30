import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { getProductModel } from "@/app/lib/models/Product";
import { getWinningModel } from "@/app/lib/models/Winning";

export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const companyName = searchParams.get("name");

    if (!companyName || companyName.trim().length === 0) {
      return NextResponse.json(
        { error: "اسم الشركة مطلوب في الرابط (name query parameter)." },
        { status: 400 }
      );
    }

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);
    const Winning = getWinningModel(conn);

    // 1) Fetch products for this company
    const products = await Product.find({ company: companyName.trim() }).lean();

    if (!products || products.length === 0) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }


    // 2) Fetch winning records for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesRecords = await Winning.find({
      date: { $gte: thirtyDaysAgo },
      transactionType: "in"
    }).lean();

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
        _id: product._id,
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
