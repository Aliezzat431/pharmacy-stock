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
    return null; // Could show loading spinner here
  }

  return isAuthenticated ? (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Background applied here so ALL nested divs inherit */}
        <div className="flex-1 overflow-y-auto p-4 ">
          <div className="w-full h-full bg-transparent">
            {children}
          </div>
        </div>

        <footer
  className="text-center text-sm text-white py-2 border-t border-white/20 bg-transparent"
>
  جميع الحقوق محفوظة © 2025
</footer>

      </div>
    </div>
  ) : (
    <Login />
  );
};

export default AuthWrapper;
