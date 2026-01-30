import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { getSetting } from "@/app/lib/getSetting";
import { NextResponse } from "next/server";
import { getProductModel } from "@/app/lib/models/Product";

export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);

    const threshold = Number(await getSetting(conn, "lowStockThreshold", 5));

    const products = await Product.find({}).sort({ name: 1 }).lean();

    const allProducts = products.map((p) => ({
      ...p,
      barcodes: Array.isArray(p.barcodes) ? p.barcodes : [],
      unitOptions: Array.isArray(p.unitOptions) ? p.unitOptions : [],
      isBaseUnit: !!p.isBaseUnit,
      isShortcoming: !!p.isShortcoming,
      quantity: Number(p.quantity) || 0,
      expiryDate: p.expiryDate ? new Date(p.expiryDate) : null,
    }));

    const shortcomings = allProducts.filter((p) => p.quantity < threshold);

    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const expiringSoon = allProducts.filter((p) => {
      if (!p.expiryDate) return false;
      if (isNaN(p.expiryDate.getTime())) return false;
      return p.expiryDate > now && p.expiryDate <= threeMonthsFromNow;
    });

    const expired = allProducts.filter((p) => {
      if (!p.expiryDate) return false;
      if (isNaN(p.expiryDate.getTime())) return false;
      return p.expiryDate <= now;
    });

    return NextResponse.json({
      success: true,
      data: {
        shortcomings,
        expiringSoon,
        expired,
        threshold,
      },
    });
  } catch (error) {
    console.error("Inventory Report API Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
