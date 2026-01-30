import { NextResponse } from "next/server";
import { getDb } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/verifyToken";
import { getProductModel } from "@/app/lib/models/Product";
import { getCompanyModel } from "@/app/lib/models/Company";
import { getWinningModel } from "@/app/lib/models/Winning";
import { getSetting } from "@/app/lib/getSetting";
import { typesWithUnits } from "@/app/lib/unitOptions";

export async function POST(req) {
  let session;

  try {
    const user = verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);
    const Company = getCompanyModel(conn);
    const Winning = getWinningModel(conn);

    const body = await req.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: "يجب إرسال قائمة منتجات صحيحة (مصفوفة غير فارغة)." }, { status: 400 });
    }

    const threshold = await getSetting(conn, "lowStockThreshold", 5);

    session = await conn.startSession();
    session.startTransaction();

    try {
      let totalAmount = 0;
      const reasons = [];

      for (const productData of body) {
        const {
          name,
          type,
          quantity,
          barcode,
          unitConversion,
          expiryDate,
          purchasePrice,
          salePrice,
          company,
          details,
        } = productData;

        if (!name || !type || !barcode || !company || purchasePrice == null || salePrice == null || quantity == null) {
          throw new Error("جميع الحقول مطلوبة: الاسم، النوع، السعرين، الكمية، الباركود، الشركة");
        }

        const allowedUnits = typesWithUnits[type];
        if (!allowedUnits) {
          throw new Error(`النوع "${type}" غير معروف.`);
        }

        // لو الشركة مش موجودة ينشأها
        let companyDoc = await Company.findOne({ name: company }).session(session);
        if (!companyDoc) {
          companyDoc = await Company.create([{ name: company }], { session });
        }

        const parsedPurchasePrice = Number(purchasePrice);
        const parsedSalePrice = Number(salePrice);
        const parsedQuantity = Number(quantity);
        const parsedUnitConversion = unitConversion ? Number(unitConversion) : null;

        if (isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0) {
          throw new Error(`سعر الشراء غير صحيح للمنتج "${name}".`);
        }
        if (isNaN(parsedSalePrice) || parsedSalePrice < 0) {
          throw new Error(`سعر البيع غير صحيح للمنتج "${name}".`);
        }
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
          throw new Error(`الكمية غير صحيحة للمنتج "${name}".`);
        }

        const hasMultipleUnits = allowedUnits.length === 2;
        const latestUnit = allowedUnits.at(-1);

        if (hasMultipleUnits && (parsedUnitConversion === null || isNaN(parsedUnitConversion) || parsedUnitConversion <= 0)) {
          throw new Error(`عدد الوحدات داخل العلبة يجب أن يكون رقمًا أكبر من صفر للمنتج "${name}"`);
        }

        // Merge logic
        let product = await Product.findOne({ name: name.trim(), type: type, price: parsedSalePrice }).session(session);

        if (product) {
          if (!product.barcodes.includes(barcode)) product.barcodes.push(barcode);
          product.barcode = barcode;
          product.quantity += parsedQuantity;
          product.isShortcoming = product.quantity < threshold;
          await product.save({ session });
        } else {
          const newProduct = new Product({
            name: name.trim(),
            type,
            unit: latestUnit,
            quantity: parsedQuantity,
            price: parsedSalePrice,
            purchasePrice: parsedPurchasePrice,
            barcode,
            barcodes: [barcode],
            unitConversion: parsedUnitConversion,
            isBaseUnit: !hasMultipleUnits,
            expiryDate,
            isShortcoming: parsedQuantity < threshold,
            company,
            details: details || "",
            unitOptions: allowedUnits
          });

          product = await newProduct.save({ session });
        }

        totalAmount += parsedPurchasePrice * parsedQuantity;
        reasons.push(`${parsedQuantity} ${product.unit} ${name}`);
      }

      if (totalAmount > 0) {
        await Winning.create(
          [{ amount: totalAmount, reason: `تم شراء ${reasons.join(" و ")}`, transactionType: "out" }],
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({ success: true, message: "تم استيراد المنتجات بنجاح" }, { status: 201 });
    } catch (innerError) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ error: innerError.message }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /settings/import error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء الاستيراد" }, { status: 500 });
  }
}
