import { NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import { getUserModel } from '@/app/lib/models/User';

export async function POST(request) {
  console.log('========== REGISTER API HIT ==========');

  try {
    // 🔍 Debug headers
    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType);

    // 🔍 Try reading raw body
    let rawBody;
    try {
      rawBody = await request.text();
      console.log('RAW BODY:', rawBody);
    } catch (e) {
      console.error('Error reading raw body:', e);
    }

    // ❗ لازم نرجع نعمل parse تاني لأن request.text بيستهلك الـ stream
    let body;
    try {
      body = rawBody ? JSON.parse(rawBody) : null;
      console.log('PARSED BODY:', body);
    } catch (e) {
      console.error('JSON PARSE ERROR:', e);
      return NextResponse.json(
        { success: false, message: 'Body مش JSON صحيح' },
        { status: 400 }
      );
    }

    if (!body) {
      return NextResponse.json(
        { success: false, message: 'Body فاضي' },
        { status: 400 }
      );
    }

    const { username, password, pharmacyId, masterPin } = body;

    console.log('username:', username);
    console.log('password:', password ? '***' : undefined);
    console.log('pharmacyId:', pharmacyId);
    console.log('masterPin:', masterPin ? '***' : undefined);

    const adminKey = process.env.ADMIN_KEY;
    const jwtSecret = process.env.JWT_SECRET;
    const envMasterPin = process.env.MASTER_PIN;

    console.log('ENV CHECK:', {
      hasAdminKey: !!adminKey,
      hasJwtSecret: !!jwtSecret,
      hasMasterPin: !!envMasterPin,
    });

    // ✅ Validations
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, message: 'اسم المستخدم لازم يكون نص لا يقل عن 3 أحرف' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'كلمة المرور لازم تكون 6 أحرف على الأقل' },
        { status: 400 }
      );
    }

    if (!adminKey && !envMasterPin) {
      return NextResponse.json(
        { success: false, message: 'ADMIN_KEY أو MASTER_PIN غير موجود' },
        { status: 500 }
      );
    }

    if (!jwtSecret) {
      return NextResponse.json(
        { success: false, message: 'JWT_SECRET غير موجود' },
        { status: 500 }
      );
    }

    // 🧠 Role logic
    let role = 'employee';

    if (masterPin) {
      console.log('Trying master registration...');
      if (masterPin === envMasterPin) {
        role = 'master';
      } else {
        return NextResponse.json(
          { success: false, message: 'Master PIN غير صحيح' },
          { status: 403 }
        );
      }
    } else {
      console.log('Employee registration...');
      if (!password.includes(adminKey)) {
        return NextResponse.json(
          { success: false, message: 'كلمة المرور لازم تحتوي على Admin Key' },
          { status: 400 }
        );
      }
    }

    if (!pharmacyId || (pharmacyId !== '1' && pharmacyId !== '2')) {
      return NextResponse.json(
        { success: false, message: 'pharmacyId غير صالح' },
        { status: 400 }
      );
    }

    // 🔌 DB
    console.log('Connecting to DB, pharmacyId:', pharmacyId);
    const conn = await getDb(pharmacyId);
    const User = getUserModel(conn);

    const existingUser = await User.findOne({ username: username.trim() });
    console.log('existingUser:', !!existingUser);

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'اسم المستخدم موجود بالفعل' },
        { status: 409 }
      );
    }

    if (role === 'master') {
      const masterExists = await User.findOne({ role: 'master' });
      console.log('masterExists:', !!masterExists);

      if (masterExists) {
        return NextResponse.json(
          { success: false, message: 'يوجد مستخدم ماستر بالفعل' },
          { status: 403 }
        );
      }
    }

    // 🧾 Create user
    const newUser = await User.create({
      username: username.trim(),
      password,
      pharmacyId,
      role,
    });

    console.log('User created:', {
      id: newUser._id.toString(),
      role: newUser.role,
    });

    // 🔐 JWT
    const token = jwt.sign(
      {
        userId: newUser._id.toString(),
        username: newUser.username,
        pharmacyId,
        role,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    console.log('TOKEN GENERATED');

    return NextResponse.json(
      { success: true, message: 'تم التسجيل بنجاح', token },
      { status: 200 }
    );

  } catch (error) {
    console.error('REGISTER API ERROR:', error);
    return NextResponse.json(
      { success: false, message: 'خطأ في الخادم' },
      { status: 500 }
    );
  }
}
