import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Pharmacy Manager App",
    }
});

export async function POST(req) {
    try {
        const { data } = await req.json();

        if (!data || data.length === 0) {
            return NextResponse.json({ report: "لا توجد بيانات كافية لتوليد التقرير حالياً." });
        }

        // Basic analysis for context
        const totalIn = data.reduce((acc, day) => acc + day.totalIn, 0);
        const totalOut = data.reduce((acc, day) => acc + day.totalOut, 0);
        const netProfit = totalIn - totalOut;
        const avgDailyIn = totalIn / data.length;
        const allOrders = data.flatMap(day => day.orders);

        // Prepare summary for AI
        const summary = {
            daysAnalyzed: data.length,
            totalIncome: totalIn,
            totalExpenses: totalOut,
            netProfit: netProfit,
            averageDailyIncome: avgDailyIn,
            expenseReasons: allOrders.filter(o => o.type === 'out').map(o => `${o.amount} ج.م: ${o.reason}`).slice(0, 10),
            incomeReasons: allOrders.filter(o => o.type === 'in').map(o => `${o.amount} ج.م: ${o.reason}`).slice(0, 10)
        };

        if (process.env.OPENROUTER_API_KEY) {
            console.log("[AI Report] Generating real report via OpenRouter...");
            try {
                const prompt = `
You are a professional financial analyst for a pharmaceutical business in Egypt.
Analyze the following financial snapshot of a pharmacy for the past ${summary.daysAnalyzed} days:
- Total Revenue/Income: ${summary.totalIncome} EGP
- Total Expenses/Purchases: ${summary.totalExpenses} EGP
- Net Profit/Cash Flow: ${summary.netProfit} EGP
- Top Expenses Details: ${summary.expenseReasons.join(' | ')}
- Top Sales Examples: ${summary.incomeReasons.join(' | ')}

Requested Output (Arabic):
1. Quick Performance Summary (Professional).
2. Analysis of the current financial health (Growth, Risk, or Stability).
3. 3 Actionable, specific business recommendations in Arabic.
Use Markdown formatting and keep it professional and encouraging.
Return the analysis as a string.
`;

                const completion = await openai.chat.completions.create({
                    model: "openai/gpt-oss-120b",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.5,
                    max_tokens: 1500
                });

                const aiReport = completion.choices?.[0]?.message?.content;
                if (aiReport) {
                    return NextResponse.json({ report: aiReport });
                }
            } catch (aiErr) {
                console.error("[AI Report] AI Generation Failed, falling back to basic logic:", aiErr.message);
            }
        }

        // Fallback Logic (if AI fails or no key)
        const expenses = allOrders.filter(o => o.type === 'out');
        const biggestExpense = expenses.length > 0 ? expenses.reduce((prev, current) => (prev.amount > current.amount) ? prev : current) : null;

        let report = `📝 **التحليل المالي المباشر (Fallback Analysis)**\n\n`;
        report += `✅ **ملخص الأداء**: تم تحليل بيانات آخر ${data.length} أيام. سجلت الصيدلية إجمالي إيرادات بقيمة ${totalIn.toLocaleString()} ج.م ومصروفات بقيمة ${totalOut.toLocaleString()} ج.م.\n`;

        if (netProfit > 0) {
            report += `📈 **صافي الأرباح**: هناك نمو إيجابي في السيولة النقدية بصافي أرباح وقدره ${netProfit.toLocaleString()} ج.م.\n`;
        } else {
            report += `⚠ **تنبيه مالي**: المصروفات تتجاوز الإيرادات بفرق ${Math.abs(netProfit).toLocaleString()} ج.م.\n`;
        }

        if (biggestExpense) {
            report += `📍 **أكبر بند مصروفات**: ${biggestExpense.amount.toLocaleString()} ج.م والسبب: "${biggestExpense.reason}".\n`;
        }

        report += `\n💡 **توصية سريعة**: \n`;
        report += netProfit > 0
            ? `- استمر في الأداء الجيد وراقب مستويات المخزون.`
            : `- يرجى مراجعة المصروفات الكبيرة لتحسين السيولة.`;

        return NextResponse.json({ report });
    } catch (err) {
        console.error("AI Report Error:", err);
        return NextResponse.json({ error: "Failed to generate AI report" }, { status: 500 });
    }
}
