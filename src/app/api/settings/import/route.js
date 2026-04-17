import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";
import { verifyToken } from "@/app/lib/verifyToken";
import { getSetting } from "@/app/lib/getSetting";
import { typesWithUnits, treatmentTypes } from "@/app/lib/unitOptions";

export async function POST(req) {
  try {
    const user = await verifyToken(req.headers);
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: "يجب إرسال قائمة منتجات صحيحة (مصفوفة غير فارغة)." }, { status: 400 });
    }

    const threshold = await getSetting(null, "lowStockThreshold", 5);

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
            throw new Error(`جميع الحقول مطلوبة للمنتج "${name}": الاسم، النوع، السعرين، الكمية، الباركود، الشركة`);
        }

        const typeDef = treatmentTypes.find(t => t.name === type);
        if (!typeDef) {
            throw new Error(`النوع "${type}" غير معروف.`);
        }
        const allowedUnits = typesWithUnits[type];

        // Ensure company exists
        const { data: existingCompany, error: compErr } = await supabase
            .from('companies')
            .select('name')
            .eq('name', company)
            .single();
        
        if (compErr && compErr.code !== 'PGRST116') throw compErr;

        if (!existingCompany) {
            await supabase.from('companies').insert({ name: company });
        }

        const parsedPurchasePrice = Number(purchasePrice);
        const parsedSalePrice = Number(salePrice);
        const parsedQuantity = Number(quantity);
        const parsedUnitConversion = unitConversion ? Number(unitConversion) : 1;

        if (isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0) {
            throw new Error(`سعر الشراء غير صحيح للمنتج "${name}".`);
        }
        if (isNaN(parsedSalePrice) || parsedSalePrice < 0) {
            throw new Error(`سعر البيع غير صحيح للمنتج "${name}".`);
        }
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            throw new Error(`الكمية غير صحيحة للمنتج "${name}".`);
        }

        // Logic to find or create product
        let { data: product, error: prodErr } = await supabase
            .from('products')
            .select('*')
            .eq('name', name.trim())
            .single();

        if (prodErr && prodErr.code !== 'PGRST116') throw prodErr;

        if (!product) {
            const { data: newProd, error: insertErr } = await supabase
                .from('products')
                .insert({
                    name: name.trim(),
                    type,
                    unit: typeDef.baseUnit,
                    unit_conversion: parsedUnitConversion,
                    company,
                    unit_options: allowedUnits,
                    is_shortcoming: parsedQuantity < threshold
                })
                .select()
                .single();
            
            if (insertErr) throw insertErr;
            product = newProd;
        }

        // Add Batch
        const { error: batchErr } = await supabase
            .from('batches')
            .insert({
                product_id: product.id,
                barcode,
                quantity: parsedQuantity,
                purchase_price: parsedPurchasePrice,
                selling_price: parsedSalePrice,
                expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
                purchase_date: new Date().toISOString()
            });

        if (batchErr) throw batchErr;

        // Update shortcoming status
        const { data: allBatches } = await supabase
            .from('batches')
            .select('quantity')
            .eq('product_id', product.id);
        
        const totalQty = (allBatches || []).reduce((sum, b) => sum + Number(b.quantity), 0);
        await supabase.from('products').update({ is_shortcoming: totalQty < threshold }).eq('id', product.id);

        totalAmount += parsedPurchasePrice * parsedQuantity;
        reasons.push(`${parsedQuantity} ${product.unit} ${name}`);
    }

    if (totalAmount > 0) {
        await supabase.from('winnings').insert({
            amount: totalAmount,
            reason: `تم استيراد مواد: ${reasons.join(" و ")}`,
            transaction_type: "out",
            date: new Date().toISOString()
        });
    }

    return NextResponse.json({ success: true, message: "تم استيراد المنتجات بنجاح" }, { status: 201 });

  } catch (error) {
    console.error("POST /settings/import error:", error);
    return NextResponse.json({ error: error.message || "حدث خطأ أثناء الاستيراد" }, { status: 500 });
  }
}
