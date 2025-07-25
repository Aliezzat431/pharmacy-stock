"use client";

import { useEffect, useState } from 'react';
import Login from './login';
import Sidebar from './sidebar';

const AuthWrapper = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  if (isAuthenticated === null) {
    return null; // or a spinner
  }

  return isAuthenticated ? (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-zinc-900">
        {children}
      </div>
    </div>
  ) : (
    <Login />
  );
};

export default AuthWrapper;
