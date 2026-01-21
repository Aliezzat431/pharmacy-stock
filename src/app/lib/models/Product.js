import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },
    unitConversion: { type: Number },
    isBaseUnit: { type: Boolean, default: false },
    barcode: { type: String, required: true },
    barcodes: [{ type: String }],
    expiryDate: { type: Date, required: true },
    unitOptions: [{ type: String }],
    isShortcoming: { type: Boolean, default: false },
    company: { type: String, required: true },
    details: { type: String, default: "" },
}, { timestamps: true });

ProductSchema.index({ name: 'text', barcode: 'text', barcodes: 'text' });

export const getProductModel = (conn) => conn.models.Product || conn.model('Product', ProductSchema);
