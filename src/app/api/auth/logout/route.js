import { NextResponse } from "next/server";

export async function POST() {
    try {
        const response = NextResponse.json(
            { success: true, message: "تم تسجيل الخروج بنجاح" },
            { status: 200 }
        );

        response.cookies.set("token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 0, // Expire immediately
            path: "/",
        });

        return response;
    } catch (error) {
        return NextResponse.json(
            { success: false, message: "فشل تسجيل الخروج" },
            { status: 500 }
        );
    }
}
