"use client";

import { useEffect, useState } from "react";
import Login from "./login";
import Sidebar from "./sidebar";
import axios from "axios";

const AuthWrapper = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    const verifyToken = async () => {
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const res = await axios.post("/api/verify-token", { token });
        console.log(res.data.success);
        
        setIsAuthenticated(res.data.success);
      } catch (err) {
        console.error("Token verification failed:", err);
        setIsAuthenticated(false);
      }
    };

    verifyToken();
  }, []);

  if (isAuthenticated === null) {
    return null; // Or a spinner/loading UI
  }

  return isAuthenticated ? (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-zinc-900">
          {children}
        </div>
        <footer className="text-center text-sm text-gray-500 dark:text-gray-400 py-2 border-t border-gray-200 dark:border-zinc-800 bg-gray-100 dark:bg-zinc-950">
          جميع الحقوق محفوظة © 2025
        </footer>
      </div>
    </div>
  ) : (
    <Login />
  );
};

export default AuthWrapper;
