import { NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserModel } from '@/app/lib/models/User';

export async function POST(request) {
  try {
    const { username, password, pharmacyId } = await request.json();
    const adminKey = process.env.ADMIN_KEY;
    const jwtSecret = process.env.JWT_SECRET;

    // Validation
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "اسم المستخدم لازم يكون نص لا يقل عن 3 أحرف" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "كلمة المرور لازم تكون 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    if (!adminKey) {
      return NextResponse.json(
        { success: false, message: "ADMIN_KEY غير موجود في المتغيرات" },
        { status: 500 }
      );
    }

    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, message: "JWT_SECRET غير موجود في المتغيرات" },
        { status: 500 }
      );
    }

    if (!password.includes(adminKey)) {
      return NextResponse.json(
        { success: false, message: "كلمة المرور لازم تحتوي على Admin Key" },
        { status: 400 }
      );
    }

    if (!pharmacyId || (pharmacyId !== "1" && pharmacyId !== "2")) {
      return NextResponse.json(
        { success: false, message: "pharmacyId غير صالح" },
        { status: 400 }
      );
    }

    // Connect to DB
    const conn = await getDb(pharmacyId);
    const User = getUserModel(conn);

    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "اسم المستخدم موجود بالفعل" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username: username.trim(),
      password: hashedPassword,
      pharmacyId: pharmacyId || "1"
    });

    const userId = newUser._id.toString();

    // Generate token
    const token = jwt.sign(
      { username: username.trim(), userId, pharmacyId: pharmacyId || "1" },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return NextResponse.json(
      { success: true, message: 'تم التسجيل بنجاح', token },
      { status: 200 }
    );

  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, message: 'خطأ في الخادم' },
      { status: 500 }
    );
  }
}
