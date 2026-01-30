import { getDb } from "@/app/lib/db";
import { getChatMessageModel } from "@/app/lib/models/ChatMessage";
import { NextResponse } from 'next/server';
import OpenAI from "openai";
import { verifyToken } from "@/app/lib/verifyToken";
import { safeJsonParse } from "@/app/lib/ai/utils";
import { tools, systemPrompt } from "@/app/lib/ai/config";
import * as handlers from "@/app/lib/ai/handlers";

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: apiKey?.startsWith('sk-or-v1') ? "https://openrouter.ai/api/v1" : undefined
});

const undoHistory = new Map(); // userId -> undoData

// ================== GET CHAT HISTORY ==================
export async function GET(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ message: "غير مصرح لك" }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const ChatMessage = getChatMessageModel(conn);

    const history = await ChatMessage.find({
      pharmacyId: user.pharmacyId,
      userId: user.userId
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return NextResponse.json(history.reverse());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "خطأ في جلب السجل" }, { status: 500 });
  }
}

// ================== DELETE (CLEAR HISTORY) ==================
export async function DELETE(req) {
  try {
    const user = verifyToken(req.headers);
    if (!user) return NextResponse.json({ message: "غير مصرح لك" }, { status: 401 });

    const conn = await getDb(user.pharmacyId);
    const ChatMessage = getChatMessageModel(conn);

    await ChatMessage.deleteMany({
      pharmacyId: user.pharmacyId,
      userId: user.userId
    });

    return NextResponse.json({ message: "تم مسح سجل المحادثة بنجاح" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "خطأ في مسح السجل" }, { status: 500 });
  }
}

// ================== POST ROUTE (CHAT) ==================
export async function POST(req) {
  console.log("🟢 Chat POST started");

  try {
    const body = await req.json();
    console.log("📥 Request body:", body);

    const { message } = body;

    const user = verifyToken(req.headers);
    console.log("👤 Verified user:", user);

    if (!user) {
      console.warn("⛔ Unauthorized request");
      return NextResponse.json(
        { message: "غير مصرح", actions: [] },
        { status: 401 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ Missing OPENAI_API_KEY");
      return NextResponse.json(
        { message: "OPENAI_API_KEY مش موجود" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    console.log("🔐 Token extracted:", !!token);

    const ChatMessage = getChatMessageModel(await getDb(user.pharmacyId));
    console.log("🗄️ ChatMessage model ready");

    // 1. Save User Message
    await ChatMessage.create({
      pharmacyId: user.pharmacyId,
      userId: user.userId,
      role: "user",
      content: message
    });
    console.log("💾 User message saved");

    // 2. Load History (Reduced to 25 to prevent context saturation/stupidity)
    const history = await ChatMessage.find({
      pharmacyId: user.pharmacyId,
      userId: user.userId
    })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    console.log("📜 Loaded history count:", history.length);

    // 3. Build Context (Keep tool messages linked to assistant tool_calls)
    const context = history.reverse().map(m => {
      const msg = { role: m.role, content: m.content || null };

      if (m.role === "assistant" && m.tool_calls && m.tool_calls.length > 0) {
        msg.tool_calls = m.tool_calls;
      }

      if (m.role === "tool") {
        msg.tool_call_id = m.tool_call_id;
        msg.name = m.name;
        msg.content = m.content || "";
      }

      return msg;
    });

    console.log("🧠 Context mapped");

    // 4. Filter orphaned tool messages AND assistant calls without tool results
    // OpenAI/OpenRouter fail if:
    // - A tool response exists without a tool call
    // - A tool call exists without a tool response
    const finalContext = [];
    const availableToolResults = new Set(context.filter(m => m.role === "tool").map(m => m.tool_call_id));
    const availableToolCalls = new Set();
    context.forEach(m => {
      if (m.role === "assistant" && m.tool_calls) {
        m.tool_calls.forEach(tc => availableToolCalls.add(tc.id));
      }
    });

    for (const msg of context) {
      if (msg.role === "assistant" && msg.tool_calls) {
        // Only keep tool_calls that have matching results in the context
        const matchedCalls = msg.tool_calls.filter(tc => availableToolResults.has(tc.id));
        if (matchedCalls.length > 0) {
          finalContext.push({ ...msg, tool_calls: matchedCalls });
        } else if (msg.content) {
          // If no tool results match but there is text content, keep just the text
          const { tool_calls, ...justText } = msg;
          finalContext.push(justText);
        } else {
          console.warn("⚠️ Skipping assistant message with no matching results and no content");
        }
      } else if (msg.role === "tool") {
        if (availableToolCalls.has(msg.tool_call_id)) {
          finalContext.push(msg);
        } else {
          console.warn("⚠️ Orphan tool message skipped:", msg.tool_call_id);
        }
      } else {
        finalContext.push(msg);
      }
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...finalContext
    ];

    console.log("📨 Messages sent to OpenAI:", messages.length);

    // 5. Single Turn Interaction (Removed sequential loop at user request)
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages,
      tools,
      tool_choice: "auto",
      max_tokens: 2000
    });

    if (!completion?.choices?.length) {
      console.warn("⚠️ Empty completion from OpenAI");
      return NextResponse.json({ message: "لم يتمكن المساعد من الرد." });
    }

    const msg = completion.choices[0].message;
    const reasoning = msg.reasoning || (msg.reasoning_details?.length ? msg.reasoning_details[0].text : "");
    if (reasoning) console.log("🧠 Reasoning:", reasoning);

    console.log("🤖 Assistant message:", msg);
    messages.push(msg);

    // No tools → final response
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const content = msg.content || reasoning || "تمت العملية بنجاح.";
      await ChatMessage.create({
        pharmacyId: user.pharmacyId,
        userId: user.userId,
        role: "assistant",
        content: content
      });

      console.log("✅ Final assistant response sent");

      return NextResponse.json({
        message: content,
        data: null,
        type: null
      });
    }

    // Save assistant tool calls
    await ChatMessage.create({
      pharmacyId: user.pharmacyId,
      userId: user.userId,
      role: "assistant",
      tool_calls: msg.tool_calls,
      content: msg.content || null
    });

    console.log("🧰 Tool calls detected:", msg.tool_calls.length);

    let finalResult = null;
    let lastToolName = null;
    let errors = [];

    for (const call of msg.tool_calls) {
      if (!call?.function?.name || String(call.function.name) === 'undefined') {
        console.warn("⚠️ Skipping malformed tool call:", call);
        continue;
      }

      // Sanitize tool name from garbage tokens (like <|channel|>commentary)
      const rawToolName = String(call.function.name).trim().split(/[<\s(]/)[0];
      console.log("🔧 Tool call:", rawToolName);

      let args;
      let result = null;
      lastToolName = call.function.name;

      try {
        args = safeJsonParse(call.function.arguments);
        console.log("📦 Tool args:", args);
      } catch (e) {
        console.error("❌ Failed to parse tool args", e);
        result = { error: e.message };
      }

      if (!result) {
        try {
          const handlerName =
            "handle" +
            rawToolName
              .split("_")
              .map(s => s.charAt(0).toUpperCase() + s.slice(1))
              .join("");

          console.log("➡️ Handler:", handlerName);

          if (handlers[handlerName]) {
            const currentUndoData = undoHistory.get(user.userId);
            result = await handlers[handlerName](token, args, currentUndoData);
            console.log("✅ Tool result:", result);

            if (result?.undoData) {
              undoHistory.set(user.userId, result.undoData);
              console.log("↩️ Undo data saved");
            }
          } else {
            console.error("❌ Unsupported tool:", call.function.name);
            result = { error: `أداة غير مدعومة: ${call.function.name}` };
          }
        } catch (e) {
          console.error(`❌ Tool error (${call.function.name})`, e);
          result = { error: e.message };
        }
      }

      if (result?.error) {
        errors.push(result.error);
      }
      finalResult = result;

      const toolMsg = {
        role: "tool",
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result)
      };

      await ChatMessage.create({
        pharmacyId: user.pharmacyId,
        userId: user.userId,
        ...toolMsg
      });

      messages.push(toolMsg);
      console.log("📤 Tool response pushed to context");
    }

    // After tool execution, we return the result.
    // The AI doesn't get another turn here, so it will wait for the user to message again.
    let finalMessage = "تم تنفيذ العملية بنجاح. هل هناك شيء آخر؟";

    if (errors.length > 0) {
      finalMessage = `عذراً، فشلت العملية: ${errors[0]}`;
    } else if (finalResult?.message) {
      // Use the specific message from the handler if it exists
      finalMessage = finalResult.message;
    } else if (lastToolName === 'search_products') {
      if (Array.isArray(finalResult) && finalResult.length === 0) {
        finalMessage = "لم أجد أي منتجات تطابق بحثك.";
      } else if (Array.isArray(finalResult)) {
        finalMessage = `وجدت ${finalResult.length} من النتائج. اتفضل شوف الجدولة فوق.`;
      }
    }

    return NextResponse.json({
      message: finalMessage,
      data: finalResult,
      type: lastToolName
    });

    console.warn("⛔ Max loops reached");
    console.log("🧾 Final result:", finalResult);

    return NextResponse.json({
      message: "وصل المساعد للحد الأقصى من العمليات المتتالية.",
      data: finalResult,
      type: lastToolName
    });
  } catch (e) {
    console.error("🔥 Fatal error in chat POST:", e);
    return NextResponse.json(
      { message: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
