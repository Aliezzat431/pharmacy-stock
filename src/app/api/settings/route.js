import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { getSettingModel } from "@/app/lib/models/Setting";

export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const conn = await getDb(user.pharmacyId);
    const Setting = getSettingModel(conn);

    const allSettings = await Setting.find({});

    const settingsObj = allSettings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({ success: true, settings: settingsObj });
  } catch (error) {
    console.error("GET settings error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ success: false, message: "Key is required" }, { status: 400 });
    }

    // optional: validate value type
    if (value === undefined) {
      return NextResponse.json({ success: false, message: "Value is required" }, { status: 400 });
    }

    const conn = await getDb(user.pharmacyId);
    const Setting = getSettingModel(conn);

    const updatedSetting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "Setting saved successfully",
      setting: { key: updatedSetting.key, value: updatedSetting.value }
    });

  } catch (error) {
    console.error("POST settings error:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
