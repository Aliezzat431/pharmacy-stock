import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { getSetting } from "@/app/lib/getSetting";
import { NextResponse } from "next/server";
import { getProductModel } from "@/app/lib/models/Product";

export async function GET(req) {
    try {
        const user = verifyToken(req.headers);
        if (!user) return NextResponse.json({ success: false }, { status: 401 });

        const conn = await getDb(user.pharmacyId);
        const Product = getProductModel(conn);
        const threshold = await getSetting(conn, 'lowStockThreshold', 5);

        // Get all products using Mongoose
        const products = await Product.find({}).sort({ name: 1 }).lean();

        // Mongoose lean() returns plain JS objects, no need to parse JSON fields usually if they are defined in Schema
        // However, if they were stored as strings in SQLite migration, we might need to handle that. 
        // Assuming current Mongoose schema, 'barcodes' is [String], 'unitOptions' is [Mixed].
        // But for safety and consistency with previous logic:
        const allProducts = products.map(p => ({
            ...p,
            // If they are already arrays in Mongoose schema, JSON.parse might fail or be unnecessary.
            // But if the schema defines them as Strings (unlikely for proper Mongoose usage), we'd need it.
            // safe check:
            barcodes: Array.isArray(p.barcodes) ? p.barcodes : [], 
            unitOptions: Array.isArray(p.unitOptions) ? p.unitOptions : [], 
            isBaseUnit: !!p.isBaseUnit,
            isShortcoming: !!p.isShortcoming
        }));

        const shortcomings = allProducts.filter(p => p.quantity < threshold);

        const threeMonthsFromNow = new Date();
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

        const now = new Date();

        const expiringSoon = allProducts.filter(p => {
            if (!p.expiryDate) return false;
            const expiry = new Date(p.expiryDate);
            return expiry <= threeMonthsFromNow && expiry > now;
        });

        const expired = allProducts.filter(p => {
            if (!p.expiryDate) return false;
            return new Date(p.expiryDate) <= now;
        });

        return NextResponse.json({
            success: true,
            data: {
                shortcomings,
                expiringSoon,
                expired,
                threshold
            }
        });
    } catch (error) {
        console.error("Inventory Report API Error:", error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
