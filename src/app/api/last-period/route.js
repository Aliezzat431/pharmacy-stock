import { getDb } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/verifyToken';
import { NextResponse } from 'next/server';
import { getOrderModel } from '@/app/lib/models/Order';
import { getWinningModel } from '@/app/lib/models/Winning';

export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conn = await getDb(user.pharmacyId);
    const Order = getOrderModel(conn);
    const Winning = getWinningModel(conn);

    // 🕒 default = last 15 days
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(now.getDate() - 15);
    fifteenDaysAgo.setHours(0, 0, 0, 0);

    let startDate = from ? new Date(from) : fifteenDaysAgo;
    let endDate = to ? new Date(to) : now;

    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate) || isNaN(endDate)) {
      return NextResponse.json({ success: false, message: "Invalid dates" }, { status: 400 });
    }

    const winnings = await Winning.find({
      date: { $gte: startDate, $lte: endDate },
      transactionType: "in"
    }).lean();

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).lean();

    const grouped = {};

    const initDay = (date) => {
      const d = new Date(date).toISOString().split("T")[0];
      if (!grouped[d]) {
        grouped[d] = {
          date: d,
          cashSales: 0,
          debtOrdersCount: 0,
          debtTotal: 0,
          products: {} // 👈 تجميع منتجات
        };
      }
      return d;
    };

    // 💰 Cash Sales → Products
    winnings.forEach(w => {
      const d = initDay(w.date);
      grouped[d].cashSales += w.amount || 0;

      // مثال reason: "1 شريط Panadol Extra 500 mg Tablet"
      const match = w.reason?.match(/(\d+)\s+(.*)\s+(.*)/);

      const quantity = match ? Number(match[1]) : 1;
      const unit = match ? match[2] : "وحدة";
      const name = match ? match[3] : w.reason || "منتج غير معروف";

      const key = `${name}_${unit}_cash`;

      if (!grouped[d].products[key]) {
        grouped[d].products[key] = {
          name,
          unit,
          quantity: 0,
          total: 0,
          type: "cash"
        };
      }

      grouped[d].products[key].quantity += quantity;
      grouped[d].products[key].total += w.amount || 0;
    });

    // 📦 Debt Orders → Products
    orders.forEach(o => {
      if (!o.debtorId) return;

      const d = initDay(o.createdAt);
      grouped[d].debtOrdersCount += 1;
      grouped[d].debtTotal += o.total || 0;

      o.items?.forEach(item => {
        const key = `${item.name}_${item.unit}_debt`;

        if (!grouped[d].products[key]) {
          grouped[d].products[key] = {
            name: item.name,
            unit: item.unit,
            quantity: 0,
            total: 0,
            type: "debt"
          };
        }

        grouped[d].products[key].quantity += item.quantity;
        grouped[d].products[key].total += item.total;
      });
    });

    const result = Object.values(grouped)
      .map(day => ({
        ...day,
        products: Object.values(day.products)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      from: startDate,
      to: endDate,
      data: result
    });

  } catch (err) {
    console.error("Report API Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}
