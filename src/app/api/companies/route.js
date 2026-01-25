import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { getCompanyModel } from "@/app/lib/models/Company";

// GET all companies
export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const Company = getCompanyModel(conn);

    const companies = await Company.find({}).sort({ name: 1 });
    return NextResponse.json(companies);
  } catch (error) {
    console.error("GET companies error:", error);
    return NextResponse.json(
      { error: "فشل في جلب الشركات" },
      { status: 500 }
    );
  }
}

// POST create company
export async function POST(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const name = body?.name?.trim();

    if (!name || name.length < 3) {
      return NextResponse.json(
        { error: "اسم الشركة غير صالح. يجب أن يكون نصاً لا يقل عن 3 أحرف." },
        { status: 400 }
      );
    }

    const conn = await getDb(user.pharmacyId);
    const Company = getCompanyModel(conn);

    const newCompany = await Company.create({ name });

    return NextResponse.json({ id: newCompany._id, name: newCompany.name });
  } catch (error) {
    console.error("POST companies error:", error);

    // duplicate name error
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "الاسم موجود بالفعل. الرجاء اختيار اسم آخر." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "فشل في إنشاء الشركة" },
      { status: 500 }
    );
  }
}

// PATCH update company
export async function PATCH(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "Missing id or name" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "معرّف الشركة غير صالح (ID غير صحيح)." },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.trim().length < 3) {
      return NextResponse.json(
        { error: "اسم الشركة غير صالح. يجب أن يكون نصاً لا يقل عن 3 أحرف." },
        { status: 400 }
      );
    }

    const conn = await getDb(user.pharmacyId);
    const Company = getCompanyModel(conn);

    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json({
      id: updatedCompany._id,
      name: updatedCompany.name,
    });
  } catch (error) {
    console.error("PATCH companies error:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "الاسم موجود بالفعل. الرجاء اختيار اسم آخر." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "فشل في تحديث الشركة" },
      { status: 500 }
    );
  }
}
