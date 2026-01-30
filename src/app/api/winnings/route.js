import { getDb } from '@/app/lib/db';
import { verifyToken } from '@/app/lib/verifyToken';
import { NextResponse } from 'next/server';
import { getWinningModel } from '@/app/lib/models/Winning';
import { getSetting } from "@/app/lib/getSetting";

export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const full = searchParams.get("full") === "true";

    const conn = await getDb(user.pharmacyId);
    const Winning = getWinningModel(conn);

    if (full) {
      const rawWinnings = await Winning.find({}).sort({ date: 1 }).lean();
      return NextResponse.json(rawWinnings);
    }

    const baseCapital = await getSetting(conn, 'baseCapital', 100000);
    const rawWinnings = await Winning.find({}).sort({ date: 1 }).lean();

    const grouped = rawWinnings.reduce((acc, curr) => {
      const dateStr = new Date(curr.date).toISOString().split('T')[0];

      if (!acc[dateStr]) {
        acc[dateStr] = {
          _id: dateStr,
          totalIn: 0,
          totalOut: 0,
          totalSuspended: 0,
          totalSadaqah: 0,
          totalWithdrawal: 0,
          orders: []
        };
      }

      // حساب المبالغ
      if (curr.transactionType === 'in') acc[dateStr].totalIn += curr.amount;
      else if (curr.transactionType === 'out') acc[dateStr].totalOut += curr.amount;
      else if (curr.transactionType === 'suspended') acc[dateStr].totalSuspended += curr.amount;
      else if (curr.transactionType === 'sadaqah') acc[dateStr].totalSadaqah += curr.amount;
      else if (curr.transactionType === 'sadaqahPaid') acc[dateStr].totalIn += curr.amount;
      else if (curr.transactionType === 'withdrawal') acc[dateStr].totalWithdrawal += curr.amount;

      const reason = curr.transactionType === 'sadaqah'
        ? "صدقة (غير مدفوعة)"
        : curr.reason;

      acc[dateStr].orders.push({
        reason,
        amount: curr.amount,
        type: curr.transactionType === 'sadaqah' ? 'sadaqah' : curr.transactionType
      });

      return acc;
    }, {});

    const result = Object.values(grouped).sort((a, b) => a._id.localeCompare(b._id));

    // Role-based data restriction
    if (user.role !== 'master') {
      const restrictedFinal = result.map(day => ({
        date: day._id,
        orders: day.orders.map(order => ({
          reason: order.reason,
          type: order.type
        }))
      }));
      return NextResponse.json(restrictedFinal);
    }

    let runningTotal = baseCapital;
    const final = result.map(day => {
      // هنا بنحسب صافي اليوم بشكل كامل
      const netProfit = day.totalIn - (day.totalOut + day.totalSadaqah + (day.totalWithdrawal || 0));

      runningTotal += netProfit;

      return {
        date: day._id,
        totalIn: day.totalIn,
        totalOut: day.totalOut,
        totalSuspended: day.totalSuspended,
        totalSadaqah: day.totalSadaqah || 0,
        totalWithdrawal: day.totalWithdrawal || 0,
        currentCapital: runningTotal,
        orders: day.orders
      };
    });

    return NextResponse.json(final);
  } catch (error) {
    console.error("Winnings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily profit report" },
      { status: 500 }
    );
  }
}
