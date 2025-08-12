import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/connectDb";
import companyModel from "@/app/models/company.model";

// GET all companies
export async function GET() {
  await connectDB();
  const companies = await companyModel.find().lean();
  return NextResponse.json(companies);
}

export async function POST(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await connectDB();
  const newCompany = await companyModel.create({ name: body.name });
  return NextResponse.json(newCompany);
}

export async function PATCH(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await connectDB();
  const updatedCompany = await companyModel.findByIdAndUpdate(body.id, { name: body.name }, { new: true });

  if (!updatedCompany) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  return NextResponse.json(updatedCompany);
}
