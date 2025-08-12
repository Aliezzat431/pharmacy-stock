import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/app/models/user.model';
import mongoose from 'mongoose';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    const user = await User.findOne({ username, password });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    const token = jwt.sign(
      { username: user.username, userId: user._id },
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
