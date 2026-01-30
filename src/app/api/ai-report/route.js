import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://pharmacy-stock21312.vercel.app",
    "X-Title": "Pharmacy Manager App",
  },
});

export async function POST(req) {
  try {
    const { data } = await req.json();

    // ======= validation =======
    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "لا توجد بيانات كافية لتوليد التقرير. (data يجب أن تكون مصفوفة غير فارغة)" },
        { status: 400 }
      );
    }

    const invalidDay = data.find(
      (d) =>
        typeof d.totalIn !== "number" ||
        typeof d.totalOut !== "number" ||
        !Array.isArray(d.orders)
    );

    if (invalidDay) {
      return NextResponse.json(
        { error: "بيانات اليوم غير صحيحة. تأكد أن كل يوم يحتوي على totalIn و totalOut كأرقام و orders كمصفوفة." },
        { status: 400 }
      );
    }

    const totalIn = data.reduce((acc, day) => acc + day.totalIn, 0);
    const totalOut = data.reduce((acc, day) => acc + day.totalOut, 0);
    const netProfit = totalIn - totalOut;
    const avgDailyIn = totalIn / data.length;
    const allOrders = data.flatMap((day) => day.orders);

    const summary = {
      daysAnalyzed: data.length,
      totalIncome: totalIn,
      totalExpenses: totalOut,
      netProfit: netProfit,
      averageDailyIncome: avgDailyIn,
      expenseReasons: allOrders
        .filter((o) => o.type === "out")
        .map((o) => `${o.amount} ج.م: ${o.reason}`)
        .slice(0, 10),
      incomeReasons: allOrders
        .filter((o) => o.type === "in")
        .map((o) => `${o.amount} ج.م: ${o.reason}`)
        .slice(0, 10),
    };

    // ======= check API key =======
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "مفتاح OpenAI غير موجود. من فضلك اضبط OPENAI_API_KEY في بيئة التشغيل.",
        },
        { status: 401 }
      );
    }

    // ======= AI generation =======
    try {
      console.log("[AI Report] Generating report via OpenRouter...");

      const prompt = `
أنت "محسن"، مساعد صيدلية خبير وشاطر جداً، وكمان صاحب واجب.
أسلوبك في الكلام مصري، عفوي، محترم، وفيه تاتش خفة دم بس بمهنية عالية.

مطلوب منك تحليل الوضع المالي للصيدلية خلال الـ ${summary.daysAnalyzed} يوم اللي فاتوا بناءً على البيانات دي:
- إجمالي الإيرادات (الدخل): ${summary.totalIncome} ج.م
- إجمالي المصروفات: ${summary.totalExpenses} ج.م
- صافي الربح: ${summary.netProfit} ج.م
- أهم بنود المصروفات: ${summary.expenseReasons.join(" | ")}
- أمثلة للمبيعات: ${summary.incomeReasons.join(" | ")}

المطلوب منك تكتب تقرير بأسلوبك المميز (محسن) يشمل:
1. **خلاصة السريع**: ملخص للأداء في سطرين بأسلوبك.
2. **الوضع الصحي**: تحليل هل احنا في السليم (نمو) ولا محتاجين نشد (خسارة) ولا الدنيا مستقرة.
3. **نصائح محسن (3 نصائح)**: نصائح عملية للبزنس عشان نحسن الدخل ونقلل المصروف، وتكون نصائح ذكية بناء على الأرقام.

استخدم Markdown وتنسيق شيك (Bold, Lists, Emojis). خليك إيجابي ومشجع دايماً.
`;

      const completion = await openai.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 1500,
      });

      const aiReport = completion.choices?.[0]?.message?.content;

      if (!aiReport) {
        throw new Error("AI returned empty response.");
      }

      return NextResponse.json({ report: aiReport });
    } catch (aiErr) {
      console.error(
        "[AI Report] AI Generation Failed:",
        aiErr?.message || aiErr
      );

      // Detect invalid credentials
      if (
        aiErr?.message?.toLowerCase().includes("invalid") ||
        aiErr?.message?.toLowerCase().includes("unauthorized") ||
        aiErr?.message?.toLowerCase().includes("api key")
      ) {
        return NextResponse.json(
          {
            error:
              "فشل التحقق من بيانات OpenAI. (Invalid API Key أو Unauthorized). من فضلك تحقق من OPENAI_API_KEY.",
          },
          { status: 401 }
        );
      }

      // Fallback to basic report
      const expenses = allOrders.filter((o) => o.type === "out");
      const biggestExpense =
        expenses.length > 0
          ? expenses.reduce((prev, current) =>
            prev.amount > current.amount ? prev : current
          )
          : null;

      let report = `📝 **التحليل المالي المباشر (Fallback Analysis)**\n\n`;
      report += `✅ **ملخص الأداء**: تم تحليل بيانات آخر ${data.length} أيام. سجلت الصيدلية إجمالي إيرادات بقيمة ${totalIn.toLocaleString()} ج.م ومصروفات بقيمة ${totalOut.toLocaleString()} ج.م.\n`;

      if (netProfit > 0) {
        report += `📈 **صافي الأرباح**: هناك نمو إيجابي في السيولة النقدية بصافي أرباح وقدره ${netProfit.toLocaleString()} ج.م.\n`;
      } else {
        report += `⚠ **تنبيه مالي**: المصروفات تتجاوز الإيرادات بفرق ${Math.abs(
          netProfit
        ).toLocaleString()} ج.م.\n`;
      }

      if (biggestExpense) {
        report += `📍 **أكبر بند مصروفات**: ${biggestExpense.amount.toLocaleString()} ج.م والسبب: "${biggestExpense.reason}".\n`;
      }

      report += `\n💡 **توصية سريعة**: \n`;
      report += netProfit > 0
        ? `- استمر في الأداء الجيد وراقب مستويات المخزون.`
        : `- يرجى مراجعة المصروفات الكبيرة لتحسين السيولة.`;

      return NextResponse.json({
        report,
        warning:
          "تم توليد تقرير بديل لأن AI لم يستطع الرد. (تم استخدام fallback logic).",
      });
    }
  } catch (err) {
    console.error("AI Report Error:", err);
    return NextResponse.json(
      { error: "حدث خطأ أثناء توليد التقرير. حاول مرة أخرى." },
      { status: 500 }
    );
  }
}
