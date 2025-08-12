import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/connectDb";
import companyModel from "@/app/models/company.model";

// PATCH company by ID
export async function PATCH(req, { params }) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id } = params;

  await connectDB();

  const updatedCompany = await companyModel.findByIdAndUpdate(id, { name: body.name }, { new: true });

  if (!updatedCompany) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(updatedCompany);
}

// DELETE company by ID
export async function DELETE(req, { params }) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  await connectDB();

  const deletedCompany = await companyModel.findByIdAndDelete(id);

  if (!deletedCompany) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Deleted successfully", deletedCompany });
}
