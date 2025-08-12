import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/connectDb";
import Product from "@/app/models/product.model";
import { typesWithUnits } from "@/app/lib/unitOptions";

export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();
  const mode = searchParams.get("mode")?.toLowerCase() || "all";

  let filter = {};

  // فلتر البحث بالكلمة
  if (query) {
    filter.$or = [
      { name: { $regex: query, $options: "i" } },
      { barcode: { $regex: query, $options: "i" } },
    ];
  }
console.log(filter);

  if (mode === "shortcomings") {
  filter.isShortcoming = true;
  }

  const rawProducts = await Product.find(filter).lean();

  const products = rawProducts.map((product) => ({
    ...product,
    unitOptions: typesWithUnits[product.type] || [product.unit],
  }));

  return NextResponse.json({ products });
}
