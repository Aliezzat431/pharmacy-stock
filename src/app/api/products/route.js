import { getDb } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/verifyToken';
import { NextResponse } from 'next/server';
import { typesWithUnits } from '@/app/lib/unitOptions';
import { getSetting } from '@/app/lib/getSetting';
import { getProductModel } from '@/app/lib/models/Product';
import { getCompanyModel } from '@/app/lib/models/Company';
import { getWinningModel } from '@/app/lib/models/Winning';

export async function POST(req) {
  let session;

  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);
    const Company = getCompanyModel(conn);
    const Winning = getWinningModel(conn);

    const body = await req.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { error: "يجب إرسال قائمة منتجات صحيحة (مصفوفة غير فارغة)." },
        { status: 400 }
      );
    }

    const createdProducts = [];
    let totalAmount = 0;
    let reasonParts = [];

    session = await conn.startSession();
    session.startTransaction();

    try {
      for (const productData of body) {
        let {
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

        if (!name || quantity === undefined) {
          throw new Error("اسم المنتج والكمية مطلوبات.");
        }

        // Check if product exists first
        let existingProduct = await Product.findOne({ name: name.trim() }).session(session);

        // If product exists, fill missing fields from database
        if (existingProduct) {
          type = type || existingProduct.type;
          barcode = barcode || (existingProduct.barcodes?.length ? existingProduct.barcodes[0] : existingProduct.barcode);
          company = company || existingProduct.company;
          purchasePrice = purchasePrice !== undefined ? purchasePrice : existingProduct.purchasePrice;
          salePrice = salePrice !== undefined ? salePrice : existingProduct.price;
          unitConversion = (unitConversion !== undefined && unitConversion !== null) ? unitConversion : existingProduct.unitConversion;
        }

        // Final validation for new products or critical fields
        if (
          !name || !type || !barcode || !company ||
          purchasePrice === undefined || salePrice === undefined
        ) {
          throw new Error(`بيانات غير مكتملة للمنتج "${name}". يرجى التأكد من توفر: النوع، السعرين، الباركود، والشركة.`);
        }

        const allowedUnits = typesWithUnits[type];
        if (!allowedUnits) {
          throw new Error(`النوع "${type}" غير معروف.`);
        }

        // Check company existence or create if missing
        let companyDoc = await Company.findOne({ name: company }).session(session);
        if (!companyDoc) {
          console.log(`Automatic creation of company: ${company}`);
          companyDoc = await Company.create([{ name: company }], { session });
          companyDoc = companyDoc[0]; // Mongoose create with session returns an array
        }

        const parsedPurchasePrice = Number(purchasePrice);
        const parsedSalePrice = Number(salePrice);
        const parsedQuantity = Number(quantity);
        const parsedUnitConversion =
          unitConversion !== null && unitConversion !== undefined
            ? Number(unitConversion)
            : null;

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

        const threshold = await getSetting(conn, 'lowStockThreshold', 5);

        if (product) {
          // Update existing
          if (!product.barcodes.includes(barcode)) {
            product.barcodes.push(barcode);
          }
          product.barcode = barcode;

          product.quantity += parsedQuantity;
          product.isShortcoming = product.quantity < threshold;

          await product.save({ session });
        } else {
          // Create new
          const isShortcoming = parsedQuantity < threshold;
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
            isShortcoming,
            company,
            details: details || "",
            unitOptions: allowedUnits
          });

          product = await newProduct.save({ session });
        }

        createdProducts.push({
          name: product.name,
          price: product.price,
          quantity: product.quantity,
          unit: product.unit,
          total: parsedSalePrice * parsedQuantity, // ده قيمة الكمية اللي اتضافت مش المخزون كله
          unitOptions: allowedUnits,
          fullProduct: product,
        });

        totalAmount += productData.isGift ? 0 : (parsedPurchasePrice * parsedQuantity);
        reasonParts.push(`${parsedQuantity} ${product.unit} ${name}${productData.isGift ? ' (هدية)' : ''}`);
      }

      if (totalAmount > 0 && reasonParts.length > 0) {
        const reason = `تم شراء ${reasonParts.join(" و ")}`;
        await Winning.create([{
          amount: totalAmount,
          reason,
          transactionType: 'out',
          date: new Date()
        }], { session });
      } else if (reasonParts.length > 0) {
        // Only gifts added
        const reason = `تم إضافة بونص/هدية: ${reasonParts.join(" و ")}`;
        await Winning.create([{
          amount: 0,
          reason,
          transactionType: 'out', // Zero amount out is fine for logging
          date: new Date()
        }], { session });
      }

      await session.commitTransaction();

      return NextResponse.json({
        message: "تم إنشاء جميع المنتجات وتسجيل المصروف كمجموعة واحدة",
        createdProducts,
      }, { status: 201 });

    } catch (innerError) {
      await session.abortTransaction();
      console.error("Transaction error:", innerError);
      return NextResponse.json({ error: innerError.message }, { status: 400 });
    }

  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  } finally {
    if (session) {
      try {
        await session.endSession();
      } catch (e) {
        console.warn("Failed to end session:", e);
      }
    }
  }
}

export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);

    const products = await Product.find({}).sort({ name: 1 }).lean();
    return NextResponse.json(products);

  } catch (error) {
    console.error("GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const user = verifyToken(request.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { mode, product, adjustmentReason } = await request.json();

    const db = await getDb(user.pharmacyId);
    const Product = getProductModel(db);

    if (!product?._id && !product?.name) {
      return NextResponse.json(
        { success: false, message: "Missing product id or name" },
        { status: 400 }
      );
    }

    const query = product._id ? { _id: product._id } : { name: product.name.trim() };
    const existing = await Product.findOne(query);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    // لو جرد => تحديث كامل مع حساب القيمة المالية للفرق
    if (mode === "inventory") {
      const oldQty = Number(existing.quantity);
      const newQty = Number(product.quantity);
      const qtyDiff = newQty - oldQty;

      const updated = await Product.findByIdAndUpdate(
        existing._id,
        {
          ...product,
          _id: existing._id,
          quantity: newQty,
          purchasePrice: Number(product.purchasePrice || existing.purchasePrice),
          price: Number(product.price || existing.price),
        },
        { new: true }
      );

      // --- RECORD FINANCIAL IMPACT ---
      if (qtyDiff !== 0) {
        const Winning = getWinningModel(db);
        // If decrease and reason is damage/burnt, it's an 'out' (loss)
        const isLoss = qtyDiff < 0 && (adjustmentReason === 'burnt' || adjustmentReason === 'damaged' || adjustmentReason === 'expired');

        await Winning.create([{
          amount: Math.abs(qtyDiff * Number(existing.purchasePrice || 0)),
          reason: `جرد للمنتج "${existing.name}": ${adjustmentReason || (qtyDiff > 0 ? 'زيادة' : 'عجز')} بمقدار ${Math.abs(qtyDiff)} ${existing.unit}`,
          transactionType: (qtyDiff > 0 || isLoss) ? 'out' : 'in',
          date: new Date()
        }]);
      }
      // -------------------------------

      return NextResponse.json(
        { success: true, product: updated },
        { status: 200 }
      );
    }

    // لو update عادي => السيرفر يحسب profit ويعدل quantity
    if (mode === "update") {
      const isGift = !!product.isGift;
      const oldQty = Number(existing.quantity);
      const newQty = Number(product.quantity);

      const qtyDiff = newQty - oldQty; // لو موجب = زيادة
      const profitPerUnit = Number(product.price || existing.price) - Number(existing.purchasePrice);
      const profitChange = qtyDiff * profitPerUnit;

      const updated = await Product.findByIdAndUpdate(
        existing._id,
        {
          ...product,
          _id: existing._id,
          quantity: newQty,
          purchasePrice: Number(product.purchasePrice || existing.purchasePrice),
          price: Number(product.price || existing.price),
        },
        { new: true }
      );

      // --- RECORD FINANCIAL IMPACT (Skip if it's a gift) ---
      if (qtyDiff !== 0 && !isGift) {
        const Winning = getWinningModel(db);
        const isLoss = qtyDiff < 0 && (adjustmentReason === 'burnt' || adjustmentReason === 'damaged' || adjustmentReason === 'expired');

        await Winning.create([{
          amount: Math.abs(qtyDiff * Number(existing.purchasePrice || 0)),
          reason: `تعديل كمية للمنتج "${existing.name}": ${adjustmentReason || (qtyDiff > 0 ? 'زيادة' : 'نقص')} بمقدار ${Math.abs(qtyDiff)} ${existing.unit}`,
          transactionType: (qtyDiff > 0 || isLoss) ? 'out' : 'in',
          date: new Date()
        }]);
      } else if (qtyDiff > 0 && isGift) {
        const Winning = getWinningModel(db);
        await Winning.create([{
          amount: 0,
          reason: `إضافة بونص/هدية للمنتج "${existing.name}": +${Math.abs(qtyDiff)} ${existing.unit}`,
          transactionType: 'out',
          date: new Date()
        }]);
      }

      return NextResponse.json(
        { success: true, product: updated, profitChange },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Invalid mode" },
      { status: 400 }
    );

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const productToDelete = await Product.findById(id);
    if (!productToDelete) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const stockValue = (Number(productToDelete.quantity) || 0) * (Number(productToDelete.purchasePrice) || 0);

    const deletedProduct = await Product.findByIdAndDelete(id);

    // --- RECORD LOSS AS 'OUT' WINNING ---
    if (stockValue > 0) {
      const Winning = getWinningModel(conn);
      await Winning.create([{
        amount: stockValue,
        reason: `حذف منتج من النظام مع مخزون متبقي: "${productToDelete.name}" (كمية: ${productToDelete.quantity} ${productToDelete.unit})`,
        transactionType: 'out',
        date: new Date()
      }]);
    }
    // ------------------------------------

    return NextResponse.json({ success: true, message: "Product deleted successfully", lostValue: stockValue });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
