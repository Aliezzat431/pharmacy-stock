import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { getProductModel } from "@/app/lib/models/Product";
import { verifyToken } from "@/app/lib/verifyToken";
import mongoose from "mongoose";

// --- Action Implementations ---

async function updateProduct(pharmacyId, args) {
    const conn = await getDb(pharmacyId);
    const Product = getProductModel(conn);
   

console.log(args);

    const productId = args.productId || args._id;

    if (!productId) {
        throw new Error("Product ID is required for update.");
    }

    // نشيل أي حاجات مش عايزين نحدثها
    const updateData = { ...args };
    delete updateData._id;
    delete updateData.productId;

    Object.keys(updateData).forEach(
        key => updateData[key] === undefined && delete updateData[key]
    );

    const product = await Product.findByIdAndUpdate(
        productId,
        updateData,
        { new: true }
    );

    if (!product) throw new Error("Product not found.");

    return {
        success: true,
        message: `Updated product ${product.name}`,
        data: product
    };
}

async function deleteProduct(pharmacyId, args) {
    const conn = await getDb(pharmacyId);
    const Product = getProductModel(conn);

    if (!args._id) throw new Error("Product ID is required for deletion.");

    const product = await Product.findByIdAndDelete(args._id);
    if (!product) throw new Error("Product not found or already deleted.");

    return {
        success: true,
        message: `Deleted product ${product.name}`,
        data: { _id: args._id }
    };
}

async function createProduct(pharmacyId, args) {
    const conn = await getDb(pharmacyId);
    const Product = getProductModel(conn);

    // Basic validation
    if (!args.name || !args.price) throw new Error("Name and Price are required.");

    const newProduct = new Product(args);
    await newProduct.save();

    return {
        success: true,
        message: `Created product ${args.name}`,
        data: newProduct
    };
}


// --- Main Route ---

export async function POST(req) {
    try {
        const body = await req.json();
        console.log("FULL BODY:", body);

        const { action, args } = body;



if (!args || Object.keys(args).length === 0) {
  return NextResponse.json(
    { success: false, message: "Missing args for action" },
    { status: 400 }
  );
}


        const user = verifyToken(req.headers);


        if (!user) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        let result;

        switch (action) {
            case "update_product":
                result = await updateProduct(user.pharmacyId, args);
                break;
            case "delete_product":
                result = await deleteProduct(user.pharmacyId, args);
                break;
            case "create_product":
                result = await createProduct(user.pharmacyId, args);
                break;
            default:
                throw new Error(`Unknown action: ${action}`);
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error("Action API Error:", error);
        return NextResponse.json({
            success: false,
            message: error.message || "Server error executing action"
        }, { status: 500 });
    }
}
