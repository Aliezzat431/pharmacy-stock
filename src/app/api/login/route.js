import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/app/lib/db';
import { getUserModel } from '@/app/lib/models/User';

export async function POST(request) {
  try {
    const { username, password, pharmacyId } = await request.json();

    const conn = await getDb(pharmacyId);
    const User = getUserModel(conn);

    const user = await User.findOne({ username, password });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    const token = jwt.sign(
      { username: user.username, userId: user._id.toString(), pharmacyId: pharmacyId || "1" },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        token,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
