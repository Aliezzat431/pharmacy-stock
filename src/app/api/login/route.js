import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/app/lib/db';
import { getUserModel } from '@/app/lib/models/User';

export async function POST(request) {
  try {
    const { username, password, pharmacyId } = await request.json();

    // ====== validation ======
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: "اسم المستخدم غير صالح" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, message: "كلمة المرور غير صالحة" },
        { status: 400 }
      );
    }

    if (!pharmacyId || (pharmacyId !== "1" && pharmacyId !== "2")) {
      return NextResponse.json(
        { success: false, message: "pharmacyId غير صالح" },
        { status: 400 }
      );
    }

    // ====== DB & user ======
    const conn = await getDb(pharmacyId);
    const User = getUserModel(conn);
console.log({ username, password });
    // لو عندك hashing للباسورد لازم تستخدم bcrypt.compare بدل البحث المباشر
    const user = await User.findOne({ username, password });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, message: "JWT_SECRET غير موجود في المتغيرات" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        username: user.username,
        userId: user._id.toString(),
        pharmacyId: pharmacyId || "1",
        role: user.role
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json(
      {
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        user: {
          username: user.username,
          role: user.role,
          userId: user._id
        }
      },
      { status: 200 }
    );

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'خطأ في الخادم' },
      { status: 500 }
    );
  }
}
