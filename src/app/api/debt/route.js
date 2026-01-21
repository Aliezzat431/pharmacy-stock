import { getDb } from "@/app/lib/db";
import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/verifyToken";
import { getSetting } from "@/app/lib/getSetting";
import { getProductModel } from "@/app/lib/models/Product";
import { getOrderModel, getDebtorModel } from "@/app/lib/models/Order";
import { getWinningModel } from "@/app/lib/models/Winning";

export async function POST(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const Product = getProductModel(conn);
    const Order = getOrderModel(conn);
    const Debtor = getDebtorModel(conn);
    const Winning = getWinningModel(conn);

    const body = await req.json();
    const products = body.orders;
    const payAmount = body.partialPayment || 0;

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'يجب إرسال قائمة منتجات صحيحة (مصفوفة غير فارغة).' }, { status: 400 });
    }

    const session = await conn.startSession();
    session.startTransaction();

    try {
      const createdItems = [];
      let totalOrderAmount = 0;
      const reasonParts = [];

      for (const productData of products) {
        const {
          name,
          unit,
          quantity,
          fullProduct,
          price,
          unitOptions = []
        } = productData;

        const parsedQuantity = Number(quantity);
        const normalizedUnit = typeof unit === "string" ? unit : unit?.value || "";

        if (!name || !normalizedUnit || parsedQuantity === undefined) {
          throw new Error('يجب توفير الاسم والوحدة والكمية على الأقل لكل منتج');
        }

        const usedPrice = price || (fullProduct?.price ?? 0);
        const itemTotal = usedPrice * parsedQuantity;

        const normalizedUnitOptions = unitOptions
          .map(opt => typeof opt === "string" ? opt : opt?.value || "")
          .filter(Boolean);

        createdItems.push({
          name,
          price: usedPrice,
          quantity: parsedQuantity,
          unit: normalizedUnit,
          total: itemTotal,
          unitOptions: normalizedUnitOptions,
          fullProduct: fullProduct || {}
        });

        // Stock Update
        const isAgel = fullProduct?._id === "agel" || fullProduct?.id === "agel" || fullProduct?.type === "agel";
        if (!isAgel && (fullProduct?._id || fullProduct?.id)) {
          const prodId = fullProduct._id || fullProduct.id;
          const product = await Product.findById(prodId).session(session);
          if (product) {
            const baseUnit = product.unit;
            const unitConversion = product.unitConversion ?? 1;
            let decrementAmount = parsedQuantity;

            if (normalizedUnit !== baseUnit && unitConversion > 0) {
              decrementAmount = parsedQuantity / unitConversion;
            }

            product.quantity -= decrementAmount;
            const threshold = await getSetting(conn, 'lowStockThreshold', 5);
            product.isShortcoming = product.quantity < threshold;

            await product.save({ session });
          }
        }

        totalOrderAmount += usedPrice * parsedQuantity;
        reasonParts.push(`${parsedQuantity} ${normalizedUnit} ${name}`);
      }

      if (payAmount > totalOrderAmount) {
        throw new Error('المبلغ المدفوع لا يمكن أن يكون أكبر من إجمالي الدين.');
      }

      // Find or create debtor
      let debtor = await Debtor.findOne({ name: body.name }).session(session);
      if (!debtor) {
        debtor = await Debtor.create([{ name: body.name, partialPayments: 0 }], { session });
        debtor = debtor[0];
      }

      // Create Order
      await Order.create([{
        debtorId: debtor._id,
        total: totalOrderAmount,
        items: createdItems
      }], { session });

      // Record Winning & Update Debtor
      if (payAmount > 0) {
        debtor.partialPayments += payAmount;
        await debtor.save({ session });

        await Winning.create([{
          amount: payAmount,
          reason: `دفع جزئي عند تسجيل دين للعميل ${body.name} عن ${reasonParts.join(' + ')}`,
          transactionType: 'in'
        }], { session });
      } else {
        await Winning.create([{
          amount: totalOrderAmount,
          reason: `تم إيداع مال من منتج غير محدد للعميل ${body.name}`,
          transactionType: 'suspended'
        }], { session });
      }

      // Final check for full payment
      const debtAggregation = await Order.aggregate([
        { $match: { debtorId: debtor._id } },
        { $group: { _id: null, totalDebt: { $sum: "$total" } } }
      ]).session(session);

      const totalDebtAmount = debtAggregation[0]?.totalDebt || 0;

      if (debtor.partialPayments >= totalDebtAmount) {
        await Debtor.findByIdAndDelete(debtor._id, { session });
        await Order.deleteMany({ debtorId: debtor._id }, { session });
      }

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({
        success: true,
        createdProducts: createdItems,
        totalAmount: totalOrderAmount,
        paidAmount: payAmount,
        remainingAmount: totalOrderAmount - payAmount,
        reason: reasonParts.join(' + '),
      });

    } catch (innerError) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ error: innerError.message }, { status: 400 });
    }
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const Order = getOrderModel(conn);
    const Debtor = getDebtorModel(conn);

    const debtors = await Debtor.find({}).lean();

    const enrichedDebtors = await Promise.all(debtors.map(async (debtor) => {
      const orders = await Order.find({ debtorId: debtor._id }).lean();

      const ordersTotal = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const paid = debtor.partialPayments || 0;
      const totalDebt = ordersTotal - paid;

      return {
        ...debtor,
        orders,
        totalDebt,
        totalOrders: ordersTotal,
        paid,
      };
    }));

    return NextResponse.json(enrichedDebtors, { status: 200 });
  } catch (error) {
    console.error("GET /api/debt error:", error);
    return NextResponse.json({ message: "فشل في جلب المديونيات" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const Order = getOrderModel(conn);
    const Debtor = getDebtorModel(conn);
    const Winning = getWinningModel(conn);

    const body = await req.json();
    const { name, payAmount } = body;

    if (!name || typeof payAmount !== "number" || payAmount <= 0) {
      return NextResponse.json({ message: "الاسم ومبلغ الدفع مطلوب" }, { status: 400 });
    }

    const debtor = await Debtor.findOne({ name });
    if (!debtor) return NextResponse.json({ message: "المدين غير موجود" }, { status: 404 });

    const session = await conn.startSession();
    session.startTransaction();

    try {
      let remaining = payAmount;
      let totalPaid = 0;

      // Handle suspended transactions first
      const suspendedTransactions = await Winning.find({
        transactionType: 'suspended',
        reason: { $regex: name, $options: 'i' }
      }).sort({ date: 1 }).session(session);

      for (const tx of suspendedTransactions) {
        if (remaining <= 0) break;
        const deductAmount = Math.min(tx.amount, remaining);
        remaining -= deductAmount;
        totalPaid += deductAmount;

        if (deductAmount === tx.amount) {
          await Winning.findByIdAndDelete(tx._id, { session });
        } else {
          tx.amount -= deductAmount;
          await tx.save({ session });
        }

        await Winning.create([{
          amount: deductAmount,
          reason: `تم خصم ${deductAmount} من المعاملة المعلقة للعميل ${name}`,
          transactionType: 'in'
        }], { session });
      }

      // Handle debt update
      if (remaining > 0) {
        const debtAggregation = await Order.aggregate([
          { $match: { debtorId: debtor._id } },
          { $group: { _id: null, totalDebt: { $sum: "$total" } } }
        ]).session(session);

        const totalDebt = debtAggregation[0]?.totalDebt || 0;
        const currentPaid = debtor.partialPayments || 0;
        const balanceDebt = totalDebt - currentPaid;

        if (balanceDebt > 0) {
          const partialPayment = Math.min(remaining, balanceDebt);
          remaining -= partialPayment;
          totalPaid += partialPayment;

          debtor.partialPayments += partialPayment;
          await debtor.save({ session });

          await Winning.create([{
            amount: partialPayment,
            reason: `تم دفع ${partialPayment} من ديون المنتجات للعميل ${name}`,
            transactionType: 'in'
          }], { session });
        }
      }

      // Final check for full payment
      const finalDebtAggregation = await Order.aggregate([
        { $match: { debtorId: debtor._id } },
        { $group: { _id: null, totalDebt: { $sum: "$total" } } }
      ]).session(session);
      const finalTotalDebt = finalDebtAggregation[0]?.totalDebt || 0;

      if (debtor.partialPayments >= finalTotalDebt) {
        // Check if any suspended transactions left
        const leftSuspendedCount = await Winning.countDocuments({
          transactionType: 'suspended',
          reason: { $regex: name, $options: 'i' }
        }).session(session);

        if (leftSuspendedCount === 0) {
          await Debtor.findByIdAndDelete(debtor._id, { session });
          await Order.deleteMany({ debtorId: debtor._id }, { session });
        }
      }

      await session.commitTransaction();
      session.endSession();

      return NextResponse.json({ message: "تم الدفع وتسجيل الخصم", totalPaid }, { status: 200 });

    } catch (innerError) {
      await session.abortTransaction();
      session.endSession();
      throw innerError;
    }
  } catch (error) {
    console.error("PATCH /api/debt error:", error);
    return NextResponse.json({ message: "فشل في تحديث الديون" }, { status: 500 });
  }
}






