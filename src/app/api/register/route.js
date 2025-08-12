import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '@/app/models/user.model';
import settingsModel from '@/app/models/settings.model';
import jwt from 'jsonwebtoken';

export async function POST(request) {
  try {
    const { username, password, paymentPortName } = await request.json();

    const adminKey = process.env.ADMIN_KEY;

    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Get maxUsers from settings
    let maxUsersSetting = await settingsModel.findOne({ key: 'maxUsers' });
    let maxUsers = parseInt(maxUsersSetting?.value ?? 0);

    console.log('maxUsers from DB:', maxUsers);

console.log(adminKey,password);

    if (!adminKey || !password.includes(adminKey)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must include the admin key',
        },
        { status: 400 }
      );
    }

    // Check user limit
    const userCount = await User.countDocuments();
    if (maxUsers > 0 && userCount >= maxUsers) {
      return NextResponse.json(
        {
          success: false,
          message: `User limit reached. Only ${maxUsers} users allowed.`,
        },
        { status: 403 }
      );
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 400 }
      );
    }

    // Create and save new user
    const user = new User({ username, password, paymentPortName });
    await user.save();

    // Generate token
    const jwtSecret = process.env.JWT_SECRET;
    const token = jwt.sign(
      { username: user.username, userId: user._id },
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
