"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { checkAuth } from "@/lib/redux/slices/authSlice";
import Login from "./login";
import Sidebar from "./sidebar";

const AuthWrapper = ({ children }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

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
