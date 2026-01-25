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

        if (
          !name || !type || !barcode || !company ||
          purchasePrice === undefined || salePrice === undefined || quantity === undefined
        ) {
          throw new Error("جميع الحقول مطلوبة: الاسم، النوع، السعرين، الكمية، الباركود، الشركة");
        }

        const allowedUnits = typesWithUnits[type];
        if (!allowedUnits) {
          throw new Error(`النوع "${type}" غير معروف.`);
        }

        // Check company existence
        const companyDoc = await Company.findOne({ name: company }).session(session);
        if (!companyDoc) {
          throw new Error(`الشركة "${company}" غير موجودة. يرجى إنشاؤها أولاً.`);
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
          total: product.price * product.quantity,
          unitOptions: allowedUnits,
          fullProduct: product,
        });

        totalAmount += parsedPurchasePrice * parsedQuantity;
        reasonParts.push(`${parsedQuantity} ${product.unit} ${name}`);
      }

      if (totalAmount > 0 && reasonParts.length > 0) {
        const reason = `تم شراء ${reasonParts.join(" و ")}`;
        await Winning.create([{
          amount: totalAmount,
          reason,
          transactionType: 'out'
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

export async function PATCH(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);
    const Winning = getWinningModel(conn);

    const body = await req.json();
    const { id, mode } = body;

    if (!id || !mode) {
      return NextResponse.json({ error: 'Missing id or mode' }, { status: 400 });
    }

    if (mode === 'barcode') {
      const { barcode } = body;
      if (!barcode) return NextResponse.json({ error: 'Missing barcode' }, { status: 400 });

      await Product.findByIdAndUpdate(id, { barcode });
      return NextResponse.json({ success: true });
    }

    if (mode === 'expiryDate') {
      const { expiryDate } = body;
      if (!expiryDate || isNaN(Date.parse(expiryDate))) {
        return NextResponse.json({ error: 'Invalid expiry date' }, { status: 400 });
      }
      await Product.findByIdAndUpdate(id, { expiryDate });
      return NextResponse.json({ success: true });
    }

    if (mode === 'quantity') {
      const { quantity } = body;
      if (typeof quantity !== 'number' || isNaN(quantity)) {
        return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
      }

      const product = await Product.findById(id);
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

      if (quantity < 0) return NextResponse.json({ error: 'الكمية لا يمكن أن تكون سالبة' }, { status: 400 });

      const threshold = await getSetting(conn, 'lowStockThreshold', 5);

      const oldQuantity = product.quantity;
      product.quantity = quantity;
      product.isShortcoming = quantity < threshold;

      await product.save();

      const diff = quantity - oldQuantity;
      if (diff !== 0) {
        const transactionType = diff > 0 ? 'out' : 'in';
        const amount = Math.abs(diff * product.price);
        const reason = diff > 0
          ? `زيادة كمية ${product.name} من ${oldQuantity} ${product.unit} إلى ${quantity} ${product.unit}`
          : `نقص كمية ${product.name} من ${oldQuantity} ${product.unit} إلى ${quantity} ${product.unit}`;

        await Winning.create({
          amount,
          reason,
          transactionType
        });
      }

      return NextResponse.json({ success: true });
    }

    if (mode === 'unitConversion') {
      const { unitConversion } = body;
      const parsed = Number(unitConversion);
      if (!parsed || isNaN(parsed) || parsed <= 0) {
        return NextResponse.json({ error: 'قيمة التحويل يجب أن تكون رقم أكبر من صفر' }, { status: 400 });
      }

      await Product.findByIdAndUpdate(id, { unitConversion: parsed });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
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

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
