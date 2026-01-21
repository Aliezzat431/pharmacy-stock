import { NextResponse } from 'next/server';
import { getDb } from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import { getUserModel } from '@/app/lib/models/User';

export async function POST(request) {
  try {
    const { username, password, pharmacyId } = await request.json();
    const adminKey = process.env.ADMIN_KEY;

    // Connect to the specific pharmacy DB
    const conn = await getDb(pharmacyId);
    const User = getUserModel(conn);

    if (!adminKey || !password.includes(adminKey)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must include the admin key',
        },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 400 }
      );
    }

    const newUser = await User.create({
      username,
      password,
      pharmacyId: pharmacyId || "1"
    });

    const userId = newUser._id.toString();

    // Generate token
    const jwtSecret = process.env.JWT_SECRET;
    const token = jwt.sign(
      { username, userId, pharmacyId: pharmacyId || "1" },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return NextResponse.json(
      { success: true, message: 'register successful', token },
      { status: 200 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
