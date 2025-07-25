import { connectDB } from '@/app/lib/connectDb';
import Winnings from '@/app/models/winning.model';
import { NextResponse } from 'next/server';

export async function GET(req) {
  await connectDB();

  try {
    const baseCapital = 100000;

    const result = await Winnings.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" }
          },
          totalIn: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "in"] }, "$amount", 0]
            }
          },
          totalOut: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "out"] }, "$amount", 0]
            }
          },
          totalSuspended: {
            $sum: {
              $cond: [{ $eq: ["$transactionType", "suspended"] }, "$amount", 0]
            }
          },
          orders: {
            $push: {
              reason: "$reason",
              amount: "$amount",
              type: "$transactionType"
            }
          },
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);

    let runningTotal = baseCapital;
    const final = result.map(day => {
      const netProfit = day.totalIn - day.totalOut; // يمكنك تعديل هذا إذا أردت تضمين/استثناء المعلّق
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
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch daily profit report" },
      { status: 500 }
    );
  }
}

