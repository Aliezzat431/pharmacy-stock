import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/connectDb";
import Product from "@/app/models/product.model";

const typesWithUnits = {
  "مضاد حيوي شرب": ["علبة"],
  "مضاد حيوي برشام": ["شريط", "علبة"],
  "دواء عادي برشام": ["شريط", "علبة"],
  "فيتامين برشام": ["شريط", "علبة"],
  "فيتامين شرب": ["علبة"],
  "دواء شرب عادي": ["علبة"],
  "نقط فم": ["علبة"],
  "نقط أنف": ["علبة"],
  "بخاخ فم": ["علبة"],
  "بخاخ أنف": ["علبة"],
  "مرهم": ["علبة"],
  "مستحضرات": ["علبة"],
  "لبوس": ["شريط", "علبة"],
  "حقن": ["أمبول", "علبة"],
};

export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  const filter = query
    ? {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { barcode: { $regex: query, $options: "i" } },
        ],
      }
    : {};

  const rawProducts = await Product.find(filter).lean();

  const products = rawProducts.map((product) => ({
    ...product,
    unitOptions: typesWithUnits[product.type] || [product.unit],
  }));

  return NextResponse.json({ products });
}
