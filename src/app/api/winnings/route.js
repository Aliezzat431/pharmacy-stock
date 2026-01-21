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

    // Manual grouping by date in JS
    const grouped = rawWinnings.reduce((acc, curr) => {
      // curr.date is a Date object in Mongoose, need to convert to YYYY-MM-DD
      const dateStr = new Date(curr.date).toISOString().split('T')[0];

      if (!acc[dateStr]) {
        acc[dateStr] = {
          _id: dateStr,
          totalIn: 0,
          totalOut: 0,
          totalSuspended: 0,
          orders: []
        };
      }

      if (curr.transactionType === 'in') acc[dateStr].totalIn += curr.amount;
      else if (curr.transactionType === 'out') acc[dateStr].totalOut += curr.amount;
      else if (curr.transactionType === 'suspended') acc[dateStr].totalSuspended += curr.amount;

      acc[dateStr].orders.push({
        reason: curr.reason,
        amount: curr.amount,
        type: curr.transactionType
      });

      return acc;
    }, {});

    const result = Object.values(grouped).sort((a, b) => a._id.localeCompare(b._id));

    let runningTotal = baseCapital;
    const final = result.map(day => {
      const netProfit = day.totalIn - day.totalOut;
      runningTotal += netProfit;
      return {
        date: day._id,
        totalIn: day.totalIn,
        totalOut: day.totalOut,
        totalSuspended: day.totalSuspended,
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
