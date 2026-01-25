import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getProductModel } from "@/app/lib/models/Product";
import { verifyToken } from "@/app/lib/verifyToken";

export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const mode = searchParams.get("mode")?.toLowerCase() || "all";

    let filter = {};

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { barcode: query },            // exact match
        { barcodes: query }            // exact match in array
      ];
    }

    if (mode === "shortcomings") {
      filter.isShortcoming = true;
    }

    const products = await Product.find(filter).lean();

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
