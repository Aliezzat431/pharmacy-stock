import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { getCompanyModel } from "@/app/lib/models/Company";

// GET all companies
export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const Company = getCompanyModel(conn);

    const companies = await Company.find({}).sort({ name: 1 });
    return NextResponse.json(companies);
  } catch (error) {
    console.error("GET companies error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const Company = getCompanyModel(conn);

    const body = await req.json();
    const newCompany = await Company.create({ name: body.name });

    return NextResponse.json({ id: newCompany._id, name: newCompany.name });
  } catch (error) {
    console.error("POST companies error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, name } = body;
    if (!id || !name) return NextResponse.json({ error: "Missing id or name" }, { status: 400 });

    const conn = await getDb(user.pharmacyId);
    const Company = getCompanyModel(conn);

    const updatedCompany = await Company.findByIdAndUpdate(id, { name }, { new: true });

    if (!updatedCompany) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return NextResponse.json({ id: updatedCompany._id, name: updatedCompany.name });
  } catch (error) {
    console.error("PATCH companies error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
