"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUndo, setHasUndo] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/chat", {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        const history = await res.json();
        if (Array.isArray(history)) {
          setMessages(history.map(m => ({
            role: m.role,
            content: m.content,
            // We can parse JSON for tool results if we want to render data from history
            data: m.role === "tool" ? JSON.parse(m.content) : null,
            type: m.name || null
          })));
        }
      } catch (e) {
        console.error("Failed to fetch chat history", e);
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          message: userMsg.content
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          data: data.data,
          type: data.type
        },
      ]);

      if (data.data?.undoData) {
        setHasUndo(true);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "فيه مشكلة في السيرفر. حاول تاني." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          message: "تراجع عن آخر عملية"
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          data: data.data,
          type: data.type
        },
      ]);

      setHasUndo(false);
    } catch (e) {
      alert("فشل التراجع");
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm("هل أنت متأكد من مسح سجل المحادثة؟ لا يمكن التراجع عن هذا الإجراء.")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
      });

      if (res.ok) {
        setMessages([]);
        setHasUndo(false);
      }
    } catch (e) {
      alert("فشل مسح المحادثة");
    } finally {
      setLoading(false);
    }
  };

  const getToolIcon = (type) => {
    const icons = {
      search_products: "🔍",
      check_low_stock: "📦",
      get_sales_stats: "💰",
      create_product: "➕",
      update_product: "✏️",
      delete_product: "🗑️",
      get_companies: "🏢",
      create_company: "➕",
      update_company: "✏️",
      get_debtors: "💳",
      get_daily_winnings: "📊",
      get_full_winnings: "📈",
    };
    return icons[type] || "📋";
  };

  const renderData = (msg) => {
    if (!msg.data) return null;

    // Products Search Results
    if (msg.type === "search_products" && Array.isArray(msg.data)) {
      return (
        <div className="mt-3 grid gap-2">
          {msg.data.map((p, i) => (
            <div key={i} className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-blue-500 text-gray-800">
              <div className="flex items-center justify-between">
                <div className="font-bold text-lg">{p.name}</div>
                {p.isShortcoming && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">ناقص</span>}
              </div>
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-green-700 font-semibold">💰 {p.price} ج.م</span>
                <span className="text-gray-600">📦 {p.quantity} {p.unit}</span>
              </div>
              {p.location && <div className="text-xs text-gray-500 mt-1">📍 {p.location}</div>}
            </div>
          ))}
        </div>
      );
    }

    // Low Stock
    if (msg.type === "check_low_stock" && Array.isArray(msg.data)) {
      return (
        <div className="mt-3 bg-red-50 p-3 rounded-lg border border-red-200">
          <p className="font-bold text-red-700 mb-2 flex items-center gap-1">
            <span>⚠️</span> المنتجات الناقصة ({msg.data.length})
          </p>
          <div className="space-y-1">
            {msg.data.map((p, i) => (
              <div key={i} className="text-sm bg-white p-2 rounded text-gray-800">
                • {p.name} - {p.quantity} {p.unit}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Sales Stats
    if (msg.type === "get_sales_stats" && msg.data.totalSales !== undefined) {
      return (
        <div className="mt-3 bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">💰 إجمالي مبيعات اليوم</div>
            <div className="text-3xl font-bold text-green-700">{msg.data.totalSales} ج.م</div>
            <div className="text-xs text-gray-500 mt-1">{msg.data.count} عملية بيع</div>
          </div>
        </div>
      );
    }

    // Companies List
    if (msg.type === "get_companies" && Array.isArray(msg.data)) {
      return (
        <div className="mt-3 grid gap-2">
          {msg.data.map((c, i) => (
            <div key={i} className="bg-white p-2 rounded-lg shadow-sm border-l-4 border-purple-500 text-gray-800">
              <span className="font-semibold">🏢 {c.name}</span>
            </div>
          ))}
        </div>
      );
    }

    // Debtors List
    if (msg.type === "get_debtors" && Array.isArray(msg.data)) {
      return (
        <div className="mt-3 space-y-2">
          {msg.data.map((d, i) => (
            <div key={i} className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-orange-500 text-gray-800">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">� {d.name}</span>
                <span className={`text-sm font-semibold ${d.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {d.totalDebt > 0 ? `دين: ${d.totalDebt} ج.م` : 'مسدد'}
                </span>
              </div>
              <div className="text-xs text-gray-500 flex justify-between">
                <span>إجمالي الطلبات: {d.totalOrders} ج.م</span>
                <span>المدفوع: {d.paid} ج.م</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Daily Winnings
    if (msg.type === "get_daily_winnings" && Array.isArray(msg.data)) {
      return (
        <div className="mt-3 space-y-2">
          {msg.data.slice(0, 5).map((day, i) => (
            <div key={i} className="bg-white p-3 rounded-lg shadow-sm text-gray-800">
              <div className="font-semibold text-sm text-gray-600 mb-1">📅 {day.date}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-green-600">▲ دخل: {day.totalIn} ج.م</div>
                <div className="text-red-600">▼ مصروف: {day.totalOut} ج.م</div>
                {day.totalSuspended > 0 && <div className="text-yellow-600">⏸ معلق: {day.totalSuspended} ج.م</div>}
                {day.totalSadaqah > 0 && <div className="text-blue-600">🤲 صدقة: {day.totalSadaqah} ج.م</div>}
              </div>
            </div>
          ))}
          {msg.data.length > 5 && (
            <div className="text-xs text-gray-500 text-center">... و {msg.data.length - 5} يوم آخر</div>
          )}
        </div>
      );
    }

    // Generic data response (for other new operations)
    if (msg.data.message) {
      return (
        <div className="mt-2 text-sm bg-blue-50 p-2 rounded border border-blue-200 text-gray-700">
          ✅ {msg.data.message}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col h-[90vh]">
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col flex-1 border border-white/20">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span>🤖</span> المساعد الذكي
              </h1>
              <p className="text-sm opacity-90 mt-1">
                إدارة كاملة للصيدلية: المنتجات، الشركات، المديونيات، والمبيعات
              </p>
            </div>
            <button
              onClick={handleClearChat}
              disabled={loading}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-xl"
              title="مسح سجل المحادثة"
            >
              🗑️
            </button>
          </div>

          {/* Messages */}
          <div className="p-6 flex-1 overflow-y-auto space-y-4 bg-gray-50/50">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 mt-20">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg">ابدأ محادثة مع المساعد الذكي</p>
                <div className="mt-6 grid grid-cols-2 gap-2 text-sm max-w-md mx-auto">
                  <div className="bg-white p-2 rounded shadow-sm">📦 البحث عن منتجات</div>
                  <div className="bg-white p-2 rounded shadow-sm">🏢 إدارة الشركات</div>
                  <div className="bg-white p-2 rounded shadow-sm">💳 عرض المديونيات</div>
                  <div className="bg-white p-2 rounded shadow-sm">📊 تقارير المبيعات</div>
                </div>
              </div>
            )}

            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-4 rounded-2xl shadow-md ${m.role === "user"
                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-none"
                    : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                    }`}
                >
                  {m.role === "assistant" && m.type && (
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      <span>{getToolIcon(m.type)}</span>
                      <span className="font-semibold">{m.type.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none prose-table:border prose-table:rounded-lg">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-3 rounded-lg border border-gray-200 shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200 bg-white" {...props} />
                          </div>
                        ),
                        thead: ({ node, ...props }) => <thead className="bg-gray-50/50" {...props} />,
                        th: ({ node, ...props }) => (
                          <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-b" {...props} />
                        ),
                        td: ({ node, ...props }) => (
                          <td className="px-3 py-2 text-sm text-gray-700 border-b last:border-b-0" {...props} />
                        ),
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                        strong: ({ node, ...props }) => <span className="font-bold text-blue-900" {...props} />,
                        code: ({ node, ...props }) => (
                          <code className="bg-gray-100 px-1 rounded text-pink-600 font-mono text-xs" {...props} />
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                  {renderData(m)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl shadow-md rounded-tl-none">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t bg-white/80 backdrop-blur">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مثال: ابحث عن باراسيتامول، اعرض الشركات، عايز تقرير المبيعات..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) sendMessage();
                }}
                disabled={loading}
              />

              {hasUndo && (
                <button
                  onClick={handleUndo}
                  disabled={loading}
                  className="px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition disabled:opacity-50 shadow-md font-semibold"
                  title="تراجع عن آخر عملية"
                >
                  ↩️
                </button>
              )}

              <button
                onClick={sendMessage}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 font-semibold shadow-md"
              >
                {loading ? "..." : "إرسال"}
              </button>
            </div>

            <div className="mt-2 text-xs text-gray-500 text-center">
              اكتب "تراجع" للتراجع عن آخر عملية • "اعرض الشركات" • "المديونين" • "تقرير الأرباح"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
