"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "../components/ToastContext";

export default function PayrollPage() {
    const [pin, setPin] = useState("");
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                if (payload.role === "master") {
                    setIsAuthorized(true);
                    setIsAuthorized(true);
                    fetchEmployees();
                    fetchHistory();
                }
            } catch (e) {
                console.error("Token parse error", e);
            }
        }
    }, []);


    const handlePinSubmit = async () => {
        // Fallback or secondary check if needed, but for now we rely on Role integration.
        // If the user isn't a master, they can't see this even with a PIN unless we add an API for it.
        showToast("عذراً، يجب أن تكون بحساب 'مدير' (Master) للوصول لهذه الصفحة", "error");
        setPin("");
    };

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/employees", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setEmployees(data.employees);
            }
        } catch (error) {
            showToast("فشل جلب قائمة الموظفين", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/payroll/history", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setHistory(data.transactions);
            }
        } catch (error) {
            console.error("Failed to fetch payroll history", error);
        }
    };

    const getTransactionLabel = (t) => {
        // "make manager سحب appears as مرتب"
        if (t.transactionType === 'withdrawal') return { text: 'مرتب مدير', color: 'bg-purple-100 text-purple-700' };

        // "and حوافز too"
        if (t.reason.includes('حافز') || t.reason.includes('مكافأة')) return { text: 'حوافز', color: 'bg-yellow-100 text-yellow-700' };

        // Default salary/expense
        return { text: 'مرتب/مصروف', color: 'bg-blue-100 text-blue-700' };
    };

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh]">
                <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 flex flex-col items-center gap-6 w-full max-w-md">
                    <h2 className="text-2xl font-bold text-gray-800">قسم المرتبات (محمي)</h2>
                    <p className="text-gray-500 text-center">فضلاً أدخل الرقم السري للدخول إلى صفحة الموظفين والرواتب</p>
                    <input
                        type="password"
                        placeholder="****"
                        className="w-full p-4 text-center text-3xl border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all tracking-widest"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                        autoFocus
                    />
                    <button
                        onClick={handlePinSubmit}
                        className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:shadow-lg transition-all active:scale-95"
                    >
                        دخول
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 animate-fadeIn">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">إدارة المرتبات</h1>
                    <p className="text-gray-500">تحكم كامل في بيانات الموظفين والمكافآت (محسن جاهز للمساعدة)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Employees List */}
                <div className="md:col-span-2 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-xl">
                    <h3 className="text-xl font-bold mb-4">قائمة الموظفين</h3>
                    {loading ? (
                        <p className="text-center py-10">جاري التحميل...</p>
                    ) : employees.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-400">لا يوجد موظفين مسجلين حالياً</p>
                            <button className="mt-4 text-blue-600 font-bold">أضف أول موظف</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {employees.map((emp) => (
                                <div key={emp._id} className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
                                    <div>
                                        <h4 className="font-bold text-lg">{emp.name}</h4>
                                        <p className="text-sm text-gray-500">{emp.role}</p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-blue-600 font-black text-xl">{emp.baseSalary} ج.م</p>
                                        <span className="text-xs text-green-500 bg-green-50 px-2 py-1 rounded-full font-bold">نشط</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Transaction History Section */}
            <div className="mt-8 bg-white/80 backdrop-blur rounded-2xl border border-white/50 shadow-xl p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">سجل الرواتب والمسحوبات</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-600">التاريخ</th>
                                <th className="p-3 text-sm font-semibold text-gray-600">النوع</th>
                                <th className="p-3 text-sm font-semibold text-gray-600">القيمة</th>
                                <th className="p-3 text-sm font-semibold text-gray-600">التفاصيل</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-4 text-center text-gray-400">لا توجد سجلات حديثة</td>
                                </tr>
                            ) : (
                                history.map((t) => {
                                    const label = getTransactionLabel(t);
                                    return (
                                        <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-3 text-sm text-gray-600">
                                                {new Date(t.date).toLocaleDateString('ar-EG')}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${label.color}`}>
                                                    {label.text}
                                                </span>
                                            </td>
                                            <td className="p-3 font-bold text-gray-800">{t.amount} ج.م</td>
                                            <td className="p-3 text-sm text-gray-500">{t.reason}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
