// api/checkout/route.js
import { supabase } from "@/app/lib/supabase";
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/verifyToken";
import { logActivity } from "@/app/lib/logActivity";
import { generateInvoiceNumber } from "@/app/lib/generateInvoiceNumber";
import { deductProductQuantity } from "@/app/lib/productHelpers";
import { getMultiplier } from "@/app/lib/unitOptions";

export async function POST(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { items, isSadaqah = false, paymentMethod = "cash" } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "الطلب غير صالح أو لا يحتوي على منتجات" },
        { status: 400 }
      );
    }

    const saleDetails = [];
    const deductedBatches = [];
    let totalSaleAmount = 0;
    let totalProfit = 0;

    for (const item of items) {
      const { name, productName, unit, quantity, barcode, batchId } = item;
      const searchName = name || productName;

      // 1. Find the product
      let product = null;
      if (barcode) {
        const { data, error } = await supabase
          .from('batches')
          .select('product_id, products(*)')
          .eq('barcode', barcode)
          .single();
        if (data) product = data.products;
      } else if (searchName) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .ilike('name', `%${searchName}%`)
          .limit(1)
          .maybeSingle();
        product = data;
      }

      if (!product) {
        throw new Error(`المنتج "${searchName || barcode}" غير موجود`);
      }

      const parsedQuantity = Number(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error(`الكمية غير صحيحة للمنتج: ${searchName}`);
      }

      // 2. Determine quantity to deduct in BASE units (boxes)
      const pillsPerStrip = Number(item.pillsPerStrip || 10);
      const multiplier = getMultiplier(product, unit, pillsPerStrip);
      const isSubUnit = multiplier > 1;
      
      // quantityToDeduct is always in base units for the DB
      const quantityToDeduct = parsedQuantity / multiplier;

      // 3. Deduct quantity
      const deductionResult = await deductProductQuantity(
        product.id,
        quantityToDeduct,
        product.inventory_method || 'FEFO',
        barcode
      );

      // 4. Fix revenue/profit for sub-unit sales
      // batch.selling_price is always the per-box price.
      // When selling sub-units we already deducted (parsedQty / unitConversion) boxes,
      // so the revenue is naturally correct: deducted_boxes * selling_price_per_box.
      totalSaleAmount += deductionResult.totalRevenue;
      totalProfit += deductionResult.profit;

      const displayUnit = unit || product.unit;
      deductionResult.batches.forEach(b => {
          // Show the quantity in the unit the cashier actually chose
          const displayQty = isSubUnit
              ? +(b.quantity * multiplier).toFixed(4)
              : b.quantity;
          saleDetails.push(`${displayQty} ${displayUnit} ${product.name} (دفعة ${b.batchNumber})`);
          deductedBatches.push({ ...b, displayUnit, displayQuantity: displayQty });
      });
    }

    // 4. Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(null, isSadaqah ? 'charity' : 'sale');

    // 5. Record transaction
    const { error: winError } = await supabase
      .from('winnings')
      .insert({
        amount: totalSaleAmount,
        profit: isSadaqah ? 0 : totalProfit,
        reason: saleDetails.join(" و "),
        transaction_type: isSadaqah ? 'sadaqah' : 'in',
        invoice_number: invoiceNumber,
        date: new Date().toISOString(),
        metadata: {
          batches: deductedBatches,
          items: items,
          is_virtual_invoice: true,
          payment_method: isSadaqah ? 'sadaqah' : (paymentMethod || 'cash')
        }
      });

    if (winError) throw winError;

    // 6. Log activity
    await logActivity(null, {
      action: 'sale',
      userId: user.userId,
      username: user.username,
      description: isSadaqah
        ? `عملية صدقة بمبلغ ${totalSaleAmount.toFixed(2)} جنيه`
        : `عملية بيع بمبلغ ${totalSaleAmount.toFixed(2)} جنيه`,
      metadata: {
        amount: totalSaleAmount,
        profit: totalProfit,
        itemsCount: items.length,
        isSadaqah,
        batches: deductedBatches,
        invoiceNumber
      }
    });

    return NextResponse.json({
      success: true,
      message: "تم حفظ الطلب وتحديث الكمية وتسجيل الدخل بنجاح",
      totalAmount: totalSaleAmount,
      profit: totalProfit,
      batchesUsed: deductedBatches,
      invoiceNumber
    }, { status: 201 });

  } catch (error) {
    console.error("POST /api/checkout error:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء حفظ الطلب" },
      { status: 400 }
    );
  }
}