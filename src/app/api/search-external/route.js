import { NextResponse } from "next/server";
import OpenAI from "openai";

// Fallback data
const EGYPT_DRUGS_MOCK = [

];

// In-memory cache for external results
const searchCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase();
    const type = searchParams.get("type")?.toLowerCase();

    console.log(`[Search API] Request - Query: "${query}", Type: "${type || 'All'}"`);

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    // 1. Check Cache
    const cacheKey = `${query}:${type || 'all'}`;
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`[Search API] Serving from Cache: ${cacheKey}`);
        return NextResponse.json({ results: cached.data });
    }

    let results = [];

    // OpenRouter API key only
    const OR_KEY = process.env.OPENROUTER_API_KEY;

    if (OR_KEY) {
        try {
            const prompt = `
You are a pharmacy expert in Egypt.
Return a JSON array of up to 5 real pharmaceutical products in Egypt matching: "${query}" ${type ? `of type "${type}"` : ""}.
Include: name, type, salePrice, purchasePrice, company, unitConversion, details.

RULES:
- "name" field MUST be only the BRAND NAME in ENGLISH only (e.g., "Panadol Extra"). NO Arabic in name field.
- NO concentrations (500mg), NO package sizes (10 tabs/برشام) in the "name" field.
- Put all concentration and package details in the "details" field instead.
- "company" field should use well-known short names if possible (e.g., "GSK" instead of "GlaxoSmithKline", "Amoun" instead of "Amoun Pharmaceutical").
- "Doliprane" is always "دواء عادي برشام".
- "unitConversion" MUST be a NUMBER only.
- "type" MUST be one of:
["مضاد حيوي شرب","مضاد حيوي برشام","دواء عادي برشام","فيتامين برشام","فيتامين شرب","دواء شرب عادي","نقط فم","نقط أنف","بخاخ فم","بخاخ أنف","مرهم","مستحضرات","لبوس","حقن","فوار"]
- "details" Arabic, concise but includes concentration/form/package.
Return ONLY raw JSON array.
`;
            const client = new OpenAI({
                baseURL: "https://openrouter.ai/api/v1",
                apiKey: OR_KEY,
                defaultHeaders: {
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "Pharmacy Manager App",
                }
            });

            const completion = await client.chat.completions.create({
                model: "openai/gpt-oss-120b",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.2,
                max_tokens: 1500
            });

            const content = completion.choices?.[0]?.message?.content;
            if (content) {
                const match = content.match(/\[[\s\S]*\]/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    if (Array.isArray(parsed) && parsed.length) {
                        results = parsed.map(r => ({ ...r, isAi: true }));
                        searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
                        console.log(`[Search API] Success: ${results.length} results found via AI and cached.`);
                    }
                }
            }
        } catch (err) {
            console.error("[Search API] AI error:", err.message);
        }
    } else {
        console.warn("[Search API] No OpenRouter API key configured.");
    }

    // Backup: Local Database
    if (results.length === 0) {
        console.log("[Search API] Falling back to local drug data.");
        results = EGYPT_DRUGS_MOCK
            .filter(d => d.name.toLowerCase().includes(query))
            .map(r => ({ ...r, isFallback: true }));
    }

    return NextResponse.json({ results });
}
