import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { getCompanyModel } from "@/app/lib/models/Company";

export async function PATCH(req, { params }) {
  try {
    const user = verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id } = params;

    // ===== validation =====
    if (!body?.name || typeof body.name !== "string" || body.name.trim().length < 3) {
      return NextResponse.json(
        { error: "اسم الشركة غير صالح. يجب أن يكون نصاً لا يقل عن 3 أحرف." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "معرّف الشركة غير صالح (ID غير صحيح)." },
        { status: 400 }
      );
    }

    const db = await getDb(user.pharmacyId);
    const Company = getCompanyModel(db);

    const updated = await Company.findByIdAndUpdate(
      id,
      { name: body.name.trim() },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ id: updated._id, name: updated.name });
  } catch (error) {
    console.error("PATCH company error:", error);

    // Handle duplicate name error
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "الاسم موجود بالفعل. الرجاء اختيار اسم آخر." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "معرّف الشركة غير صالح (ID غير صحيح)." },
        { status: 400 }
      );
    }

    const db = await getDb(user.pharmacyId);
    const Company = getCompanyModel(db);

    const deleted = await Company.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted successfully", id });
  } catch (error) {
    console.error("DELETE company error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
