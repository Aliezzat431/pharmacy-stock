import { NextResponse } from "next/server";
import OpenAI from "openai";

// Fallback data
const EGYPT_DRUGS_MOCK = [];

const searchCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const ALLOWED_TYPES = [
  "مضاد حيوي شرب","مضاد حيوي برشام","دواء عادي برشام","فيتامين برشام",
  "فيتامين شرب","دواء شرب عادي","نقط فم","نقط أنف","بخاخ فم","بخاخ أنف",
  "مرهم","مستحضرات","لبوس","حقن","فوار"
];

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim().toLowerCase();
  const type = searchParams.get("type")?.trim().toLowerCase();

  if (!query) return NextResponse.json({ results: [] });

  const cacheKey = `${query}:${type || "all"}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ results: cached.data });
  }

  let results = [];

  const OR_KEY = process.env.OPENROUTER_API_KEY;

  // Validate type
  if (type && !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({
      error: "نوع المنتج غير صالح",
      allowedTypes: ALLOWED_TYPES
    }, { status: 400 });
  }

  if (OR_KEY) {
    try {
      const prompt = `
You are a pharmacy expert in Egypt.
Return a JSON array of up to 5 real pharmaceutical products in Egypt matching: "${query}" ${type ? `of type "${type}"` : ""}.
Include: name, type, salePrice, purchasePrice, company, unitConversion, details.

RULES:
- "name" field MUST be only the BRAND NAME in ENGLISH only.
- NO Arabic in name field.
- NO concentrations or package sizes in the "name" field.
- Put all concentration and package details in "details".
- "company" should be short names if possible.
- "unitConversion" MUST be a NUMBER only.
- "type" MUST be one of the allowed types.
- "details" Arabic, concise.

Return ONLY raw JSON array.
`;

      const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: OR_KEY,
      });

      const completion = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1500
      });

      const content = completion.choices?.[0]?.message?.content;

      if (content) {
        // Try parse safely
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            results = parsed.map(r => ({ ...r, isAi: true }));
          }
        } catch (e) {
          // fallback to regex if strict JSON fails
          const match = content.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed)) {
              results = parsed.map(r => ({ ...r, isAi: true }));
            }
          }
        }

        if (results.length > 0) {
          searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
        }
      }
    } catch (err) {
      console.error("[Search API] AI error:", err.message);
    }
  }

  // fallback
  if (results.length === 0) {
    results = EGYPT_DRUGS_MOCK
      .filter(d => d.name.toLowerCase().includes(query))
      .map(r => ({ ...r, isFallback: true }));
  }

  return NextResponse.json({ results });
}
