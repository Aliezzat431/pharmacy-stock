import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { NextResponse } from "next/server";
import { getUserModel } from "@/app/lib/models/User";

export async function GET(req) {
    try {
        const user = verifyToken(req.headers);
        if (!user) return NextResponse.json({ success: false }, { status: 401 });

        const conn = await getDb(user.pharmacyId);
        const User = getUserModel(conn);

        // Fetch all active users as "employees"
        const employees = await User.find({ active: true })
            .select("-password")
            .sort({ username: 1 })
            .lean();

        // Map username to name for frontend compatibility
        const mappedEmployees = employees.map(e => ({
            ...e,
            name: e.username,
            role: e.role === 'master' ? 'مدير (Master)' : 'موظف'
        }));

        return NextResponse.json({ success: true, employees: mappedEmployees });
    } catch (error) {
        console.error("Employees GET Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    return NextResponse.json({
        success: false,
        message: "إضافة الموظفين تتم الآن عبر صفحة التسجيل فقط لضمان أمان الحسابات"
    }, { status: 405 });
}
