import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import settingsModel from '@/app/models/settings.model';
import User from '@/app/models/user.model';
import { connectDB } from '@/app/lib/connectDb';

export async function GET() {
    try {
        await connectDB()
        const users = await User.find({}, 'username _id').sort({ createdAt: 1 });
        const userCount = users.length;

        return NextResponse.json({
            success: true,
            userCount,
            users,
        });
    } catch (err) {
        console.error('Get users error:', err);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const req = await request.json(); // expected: { value: 3 }
        const { value } = req;
        console.log(req);

        await connectDB()


        if (typeof value !== 'number' || value < 0) {
            return NextResponse.json(
                { success: false, message: 'Invalid number' },
                { status: 400 }
            );
        }

        // Get current users
        const users = await User.find({}, 'username _id').sort({ createdAt: 1 });
        const userCount = users.length;

        if (value < userCount) {
            const toRemove = userCount - value;
            return NextResponse.json(
                {
                    success: false,
                    message: `Too many users. Please remove ${toRemove} user(s).`,
                    users,
                    toRemove,
                },
                { status: 409 }
            );
        }

        const updated = await settingsModel.findOneAndUpdate(
            { key: 'maxUsers' },
            { value },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true, data: updated });
    } catch (err) {
        console.error('Update maxUsers error:', err);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    console.log( request.nextUrl.searchParams);
    
    try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId'); // ✅ match the query param name
        
        await connectDB()
        const deleted = await User.findByIdAndDelete(userId);

        if (!deleted) {
            return NextResponse.json(
                { success: false, message: 'User not found or already deleted' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, message: 'User deleted', userId });
    } catch (err) {
        console.error('Delete user error:', err);
        return NextResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
        );
    }
}
