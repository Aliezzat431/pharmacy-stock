"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle,
    Error as ErrorIcon,
    Info,
    Warning,
    Close
} from "@mui/icons-material";

const ToastContext = createContext(null);

const icons = {
    success: <CheckCircle sx={{ color: '#4ade80', fontSize: 28 }} />,
    error: <ErrorIcon sx={{ color: '#f87171', fontSize: 28 }} />,
    info: <Info sx={{ color: '#60a5fa', fontSize: 28 }} />,
    warning: <Warning sx={{ color: '#fbbf24', fontSize: 28 }} />,
};

const bgColors = {
    success: 'radial-gradient(circle at top left, rgba(74, 222, 128, 0.15), transparent 70%)',
    error: 'radial-gradient(circle at top left, rgba(248, 113, 113, 0.15), transparent 70%)',
    info: 'radial-gradient(circle at top left, rgba(96, 165, 250, 0.15), transparent 70%)',
    warning: 'radial-gradient(circle at top left, rgba(251, 191, 36, 0.15), transparent 70%)',
};

const borderColors = {
    success: 'rgba(74, 222, 128, 0.3)',
    error: 'rgba(248, 113, 113, 0.3)',
    info: 'rgba(96, 165, 250, 0.3)',
    warning: 'rgba(251, 191, 36, 0.3)',
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = "success") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto remove
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    }, []);

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 left-6 z-[99999] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: -50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            layout
                            className="pointer-events-auto relative overflow-hidden backdrop-blur-xl min-w-[300px] max-w-md p-4 rounded-2xl shadow-2xl flex items-start gap-3"
                            style={{
                                background: 'rgba(15, 23, 42, 0.85)', // Dark Glass
                                backgroundImage: bgColors[toast.type],
                                border: `1px solid ${borderColors[toast.type]}`,
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                            }}
                        >
                            <div className="mt-0.5 shrink-0">
                                {icons[toast.type]}
                            </div>

                            <div className="flex-1">
                                <h4 className="font-bold text-white text-sm capitalize mb-0.5">
                                    {toast.type === 'error' ? 'Error' : toast.type === 'success' ? 'Success' : 'Notice'}
                                </h4>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    {toast.message}
                                </p>
                            </div>

                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                <Close fontSize="small" />
                            </button>

                            {/* Progress Bar */}
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 5, ease: "linear" }}
                                className="absolute bottom-0 left-0 h-[3px]"
                                style={{ backgroundColor: borderColors[toast.type] }}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};
