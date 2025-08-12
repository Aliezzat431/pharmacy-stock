import { connectDB } from '@/app/lib/connectDb';
import { verifyToken } from '@/app/lib/verifyToken';
import Product from '@/app/models/product.model';
import companyModel from '@/app/models/company.model';
import winningModel from '@/app/models/winning.model';
import { NextResponse } from 'next/server';
import { typesWithUnits } from '@/app/lib/unitOptions';

export async function POST(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
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
      } = productData;

      if (
        !name || !type || !barcode || !company ||
        purchasePrice === undefined || salePrice === undefined || quantity === undefined
      ) {
        return NextResponse.json({
          error: "جميع الحقول مطلوبة: الاسم، النوع، السعرين، الكمية، الباركود، الشركة",
        }, { status: 400 });
      }

      const allowedUnits = typesWithUnits[type];
      if (!allowedUnits) {
        return NextResponse.json({ error: `النوع "${type}" غير معروف.` }, { status: 400 });
      }

      // Check if company exists BEFORE creation
      const companyExists = await companyModel.findOne({ name: company });
      if (!companyExists) {
        return NextResponse.json({
          error: `الشركة "${company}" غير موجودة. يرجى إنشاؤها أولاً.`,
        }, { status: 400 });
      }

      const parsedPurchasePrice = Number(purchasePrice);
      const parsedSalePrice = Number(salePrice);
      const parsedQuantity = Number(quantity);
      const parsedUnitConversion =
        unitConversion !== null && unitConversion !== undefined
          ? Number(unitConversion)
          : null;

      if (isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0) {
        return NextResponse.json({ error: "سعر الشراء يجب أن يكون رقمًا موجبًا" }, { status: 400 });
      }

      if (isNaN(parsedSalePrice) || parsedSalePrice < 0) {
        return NextResponse.json({ error: "سعر البيع يجب أن يكون رقمًا موجبًا" }, { status: 400 });
      }

      if (isNaN(parsedQuantity) || parsedQuantity < 0) {
        return NextResponse.json({ error: "الكمية يجب أن تكون رقمًا موجبًا" }, { status: 400 });
      }

      const hasMultipleUnits = allowedUnits.length === 2;
      const latestUnit = allowedUnits.at(-1);

      if (hasMultipleUnits) {
        if (
          parsedUnitConversion === null ||
          isNaN(parsedUnitConversion) ||
          parsedUnitConversion <= 0
        ) {
          return NextResponse.json({
            error: `عدد الوحدات داخل العلبة يجب أن يكون رقمًا أكبر من صفر للمنتج "${name}"`,
          }, { status: 400 });
        }
      }

      const product = new Product({
        name,
        type,
        unit: latestUnit,
        quantity: parsedQuantity,
        price: parsedSalePrice,
        purchasePrice: parsedPurchasePrice,
        barcode,
        unitConversion: parsedUnitConversion,
        isBaseUnit: !hasMultipleUnits,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        isShortcoming: parsedQuantity < 5,
        company,
      });

      await product.save();

      // ✅ RECHECK company still exists AFTER product creation
      const stillExists = await companyModel.findOne({ name: company });
      if (!stillExists) {
        await Product.findByIdAndDelete(product._id);
        return NextResponse.json({
          error: `حدث خطأ: تم إنشاء منتج لكن الشركة "${company}" غير موجودة. تم حذف المنتج.`,
        }, { status: 400 });
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
      await winningModel.create({
        amount: totalAmount,
        reason,
        transactionType: "out",
      });
    }

    return NextResponse.json({
      message: "تم إنشاء جميع المنتجات وتسجيل المصروف كمجموعة واحدة",
      createdProducts,
    }, { status: 201 });

  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}








export async function PATCH(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { id, mode } = body;

    if (!id || !mode) {
      return new Response(JSON.stringify({ error: 'Missing id or mode' }), { status: 400 });
    }

    if (mode === 'barcode') {
      const { barcode } = body;
      if (!barcode) {
        return new Response(JSON.stringify({ error: 'Missing barcode' }), { status: 400 });
      }
      await Product.findByIdAndUpdate(id, { barcode });
      return new Response(JSON.stringify({ success: true }));
    }

    if (mode === 'expiryDate') {
      const { expiryDate } = body;
      if (!expiryDate || isNaN(Date.parse(expiryDate))) {
        return new Response(JSON.stringify({ error: 'Invalid expiry date' }), { status: 400 });
      }
      await Product.findByIdAndUpdate(id, { expiryDate: new Date(expiryDate) });
      return new Response(JSON.stringify({ success: true }));
    }

    if (mode === 'quantity') {
      const { quantity } = body;
      if (typeof quantity !== 'number' || isNaN(quantity)) {
        return new Response(JSON.stringify({ error: 'Invalid quantity' }), { status: 400 });
      }

      const product = await Product.findById(id);
      if (!product) {
        return new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 });
      }

      const oldQuantity = product.quantity;
      const newQuantity = quantity;

      // Prevent negative quantities
      if (newQuantity < 0) {
        return new Response(JSON.stringify({ error: 'الكمية لا يمكن أن تكون سالبة' }), { status: 400 });
      }

      await Product.findByIdAndUpdate(id, { quantity: newQuantity, isShortcoming: newQuantity < 5 });

      const diff = newQuantity - oldQuantity;
      const transactionType = diff > 0 ? 'out' : 'in';
      const amount = Math.abs(diff * product.price);

      if (!isNaN(amount)) {
        await winningModel.create({
          amount,
          reason:
            diff > 0
              ? `زيادة كمية ${product.name} من ${oldQuantity} ${product.unit} إلى ${newQuantity} ${product.unit}`
              : `نقص كمية ${product.name} من ${oldQuantity} ${product.unit} إلى ${newQuantity} ${product.unit}`,
          transactionType,
        });
      }

      return new Response(JSON.stringify({ success: true }));
    }

    return new Response(JSON.stringify({ error: 'Invalid mode' }), { status: 400 });
  } catch (error) {
    console.error('PATCH error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
}
