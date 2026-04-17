"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "../components/ToastContext";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  RotateCcw,
  Package,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Minus,
  Plus,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Filter,
  RefreshCw
} from "lucide-react";

const ReturnsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem("returns_search_query") || "";
    return "";
  });
  const [selectedTransaction, setSelectedTransaction] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("returns_selected_transaction");
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [returnItems, setReturnItems] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("returns_items");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [returnReason, setReturnReason] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem("returns_reason") || "";
    return "";
  });
  const [step, setStep] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("returns_step");
      return saved ? Number(saved) : 1;
    }
    return 1;
  });
  const [dateRange, setDateRange] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("returns_date_range");
      return saved ? Number(saved) : 15;
    }
    return 15;
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    localStorage.setItem("returns_search_query", searchQuery);
    localStorage.setItem("returns_selected_transaction", JSON.stringify(selectedTransaction));
    localStorage.setItem("returns_items", JSON.stringify(returnItems));
    localStorage.setItem("returns_reason", returnReason);
    localStorage.setItem("returns_step", step);
    localStorage.setItem("returns_date_range", dateRange);
  }, [searchQuery, selectedTransaction, returnItems, returnReason, step, dateRange]);

  // جلب المعاملات (فواتير البيع)
// في دالة fetchTransactions
const fetchTransactions = async (days = dateRange) => {
  try {
    setLoading(true);
    const token = Cookies.get("token");
    // 🔥 أضف showReturned=false عشان متجبش الفواتير المرتجعة
    const res = await fetch(`/api/transactions?type=sale&days=${days}&showReturned=false`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      // 🔥 فلترة تانية لو احتجنا
      const nonReturnedTransactions = data.transactions.filter(t => !t.isReturned);
      setTransactions(nonReturnedTransactions);
    }
  } catch (error) {
    console.error(error);
    showToast("فشل جلب فواتير البيع", "error");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchTransactions();
  }, []);

  // فلترة المعاملات حسب البحث
  const filteredTransactions = transactions.filter(t => 
    t.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.items?.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // إضافة منتج للمرتجع
  const addItemToReturn = (item, maxQuantity) => {
    setReturnItems(prev => {
      const existing = prev.find(i => i.productId === item.productId && i.unit === item.unit);
      
      if (existing) {
        if (existing.quantity < maxQuantity) {
          return prev.map(i => 
            i.productId === item.productId && i.unit === item.unit
              ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price }
              : i
          );
        } else {
          showToast(`الكمية القصوى ${maxQuantity}`, "warning");
          return prev;
        }
      }

      return [...prev, {
        productId: item.productId,
        name: item.name,
        unit: item.unit,
        price: item.price,
        quantity: 1,
        maxQuantity,
        total: item.price,
        originalItem: item
      }];
    });
  };

  // تحديث كمية المنتج
  const updateQuantity = (index, newQuantity) => {
    setReturnItems(prev => {
      const updated = [...prev];
      const item = updated[index];
      const qty = Math.min(Math.max(1, newQuantity), item.maxQuantity);
      updated[index] = { ...item, quantity: qty, total: qty * item.price };
      return updated;
    });
  };

  // حذف منتج من المرتجع
  const removeItem = (index) => {
    setReturnItems(prev => prev.filter((_, i) => i !== index));
  };

  // إرسال المرتجع
  const submitReturn = async () => {
    if (returnItems.length === 0) {
      showToast("اختر منتجات لإرجاعها أولاً", "warning");
      return;
    }

    if (!returnReason.trim()) {
      showToast("الرجاء إدخال سبب المرتجع", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = Cookies.get("token");
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          originalInvoiceNumber: selectedTransaction.invoiceNumber,
          originalTransactionId: selectedTransaction._id,
          items: returnItems.map(item => ({
            productId: item.productId,
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            price: item.price
          })),
          reason: returnReason
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        showToast("✅ تم إرجاع المنتجات بنجاح", "success");
        setReturnItems([]);
        setReturnReason("");
        setSelectedTransaction(null);
        setStep(1);
        fetchTransactions(); // تحديث القائمة
      } else {
        showToast(data.error || "فشل إجراء المرتجع", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // إعادة تعيين
  const resetReturn = () => {
    setReturnItems([]);
    setReturnReason("");
    setSelectedTransaction(null);
    setStep(1);
  };

  // حساب الإجمالي
  const totalReturnAmount = returnItems.reduce((sum, item) => sum + item.total, 0);

  // Animation variants
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 md:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto mb-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-xl shadow-red-500/20">
              <RotateCcw className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white">
                مرتجع المبيعات
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                إرجاع المنتجات خلال {dateRange} يوم من تاريخ البيع
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all border border-slate-200 dark:border-slate-700"
            >
              <Filter className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </button>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(Number(e.target.value));
                fetchTransactions(Number(e.target.value));
              }}
              className="px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="7">آخر 7 أيام</option>
              <option value="15">آخر 15 يوم</option>
              <option value="30">آخر 30 يوم</option>
            </select>
            <button
              onClick={() => fetchTransactions()}
              className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all border border-slate-200 dark:border-slate-700"
            >
              <RefreshCw className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Extended Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden"
            >
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Add more filters here if needed */}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="max-w-7xl mx-auto">
        {/* Steps Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${
                  step >= s 
                    ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 scale-110' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }`}>
                  {s}
                </div>
                <span className={`text-sm font-bold hidden md:block ${
                  step >= s ? 'text-slate-800 dark:text-white' : 'text-slate-400'
                }`}>
                  {s === 1 ? 'اختر الفاتورة' : s === 2 ? 'اختر المنتجات' : 'تأكيد المرتجع'}
                </span>
              </div>
              {s < 3 && (
                <ChevronLeft className={`h-5 w-5 ${
                  step > s ? 'text-red-500' : 'text-slate-300'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Transactions List */}
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            className="lg:col-span-7 space-y-6"
          >
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث برقم الفاتورة أو اسم المنتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-4 pr-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 font-bold placeholder:text-slate-400"
              />
            </div>

            {/* Transactions */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500/20 border-t-red-500"></div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <Receipt className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold">لا توجد فواتير بيع متاحة للمرتجع</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredTransactions.map((transaction) => (
                  <motion.div
                    key={transaction._id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedTransaction(transaction);
                      setStep(2);
                    }}
                    className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 ${
                      selectedTransaction?._id === transaction._id
                        ? 'border-red-500 ring-2 ring-red-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-red-500/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-black text-slate-800 dark:text-white">
                            #{transaction.invoiceNumber}
                          </span>
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full text-xs font-black">
                            {transaction.items?.length || 0} منتج
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(transaction.date).toLocaleDateString('ar-EG')}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {transaction.totalAmount?.toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className={`px-3 py-1 rounded-full text-xs font-black ${
                          transaction.paymentType === 'cash' 
                            ? 'bg-green-100 text-green-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}>
                          {transaction.paymentType === 'cash' ? 'كاش' : 'آجل'}
                        </span>
                      </div>
                    </div>

                    {/* First 3 products preview */}
                    <div className="space-y-2">
                      {transaction.items?.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                          <span className="text-slate-500">{item.quantity} {item.unit}</span>
                        </div>
                      ))}
                      {(transaction.items?.length || 0) > 3 && (
                        <p className="text-xs text-slate-400 mt-2">
                          +{(transaction.items?.length || 0) - 3} منتجات أخرى
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right Column - Return Cart */}
          <motion.div 
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            className="lg:col-span-5"
          >
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden sticky top-6">
              {/* Header */}
              <div className="p-6 bg-gradient-to-br from-red-500 to-rose-600 text-white">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Package className="h-6 w-6" />
                  سلة المرتجع
                </h3>
                <p className="opacity-80 text-sm mt-1">
                  {step === 1 && "اختر فاتورة للبدء"}
                  {step === 2 && "اختر المنتجات المراد إرجاعها"}
                  {step === 3 && "تأكيد عملية المرتجع"}
                </p>
              </div>

              {/* Selected Invoice Info */}
              {selectedTransaction && (
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-500 mb-1">الفاتورة المحددة</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-black">#{selectedTransaction.invoiceNumber}</p>
                      <p className="text-xs text-slate-500">{new Date(selectedTransaction.date).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <button
                      onClick={resetReturn}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-colors"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Product Selection */}
              {step === 2 && selectedTransaction && (
                <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div className="space-y-3">
                    {selectedTransaction.items?.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-black text-slate-800 dark:text-white">{item.name}</p>
                            <p className="text-sm text-slate-500">{item.price} ج.م / {item.unit}</p>
                          </div>
                          <span className="text-sm font-bold text-slate-600">
                            متاح: {item.quantity}
                          </span>
                        </div>
                        
                        {returnItems.find(i => i.productId === item.productId && i.unit === item.unit) ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  const existing = returnItems.findIndex(i => i.productId === item.productId && i.unit === item.unit);
                                  updateQuantity(existing, returnItems[existing].quantity - 1);
                                }}
                                className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-12 text-center font-black">
                                {returnItems.find(i => i.productId === item.productId && i.unit === item.unit)?.quantity}
                              </span>
                              <button
                                onClick={() => {
                                  const existing = returnItems.findIndex(i => i.productId === item.productId && i.unit === item.unit);
                                  updateQuantity(existing, returnItems[existing].quantity + 1);
                                }}
                                className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-green-50 hover:border-green-200 transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                const index = returnItems.findIndex(i => i.productId === item.productId && i.unit === item.unit);
                                removeItem(index);
                              }}
                              className="text-red-500 hover:text-red-600 p-2"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addItemToReturn(item, item.quantity)}
                            className="w-full py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-black hover:shadow-lg hover:scale-[1.02] transition-all"
                          >
                            إضافة للمرتجع
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && (
                <div className="p-6 space-y-4">
                  {/* Return Items Summary */}
                  <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {returnItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {item.name} ({item.quantity} {item.unit})
                        </span>
                        <span className="text-red-500 font-black">{item.total.toLocaleString()} ج.م</span>
                      </div>
                    ))}
                  </div>

                  {/* Return Reason */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      سبب المرتجع
                    </label>
                    <textarea
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="اكتب سبب إرجاع المنتجات..."
                      rows="3"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    />
                  </div>

                  {/* Total */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-slate-600">إجمالي المرتجع</span>
                      <span className="text-2xl font-black text-red-500">
                        {totalReturnAmount.toLocaleString()} <span className="text-sm">ج.م</span>
                      </span>
                    </div>

                    {/* Warning */}
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          سيتم إضافة المنتجات للمخزون وخصم قيمتها من إجمالي المبيعات. لا يمكن التراجع عن هذه العملية بعد التأكيد.
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(2)}
                        className="flex-1 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl font-black hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        رجوع
                      </button>
                      <button
                        onClick={submitReturn}
                        disabled={isSubmitting}
                        className="flex-1 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-black hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {isSubmitting ? 'جاري...' : 'تأكيد المرتجع'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {(!selectedTransaction || step === 1) && (
                <div className="p-12 text-center">
                  <Package className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-bold mb-2">اختر فاتورة من القائمة</p>
                  <p className="text-sm text-slate-400">سيتم عرض المنتجات المتاحة للمرتجع هنا</p>
                </div>
              )}

              {/* Continue Button */}
              {step === 2 && returnItems.length > 0 && (
                <div className="p-6 pt-0">
                  <button
                    onClick={() => setStep(3)}
                    className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-black hover:shadow-lg transition-all"
                  >
                    متابعة للتأكيد ({returnItems.length} منتج)
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ReturnsPage;