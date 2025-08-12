import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token غير موجود' },
        { status: 400 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;

    // Try verifying the token
    const decoded = jwt.verify(token, jwtSecret);

    return NextResponse.json(
      { success: true, message: 'Token صالح', user: decoded },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Token غير صالح' },
      { status: 401 }
    );
  }
}
