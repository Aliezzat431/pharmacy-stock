'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Logout as LogoutIcon, Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon } from '@mui/icons-material';
import { Typography, Box, IconButton, Tooltip } from '@mui/material';
import MenuIcon from "@mui/icons-material/Menu";
import { useDispatch, useSelector } from 'react-redux';
import { toggleDarkMode } from '../../lib/redux/slices/uiSlice';

const links = [
  { href: '/', label: 'كاشير المبيعات' },
  { href: '/stock', label: 'إدارة المخزون' },
  { href: '/restock', label: 'إضافة رصيد' },
  { href: '/returns', label: 'مرتجع مبيعات' },
  { href: '/debtors', label: 'حسابات العملاء' },
  { href: '/inventory-report', label: 'النواقص والانتهاء' },
  { href: '/dashboard', label: 'تقارير الأرباح' },
  { href: '/companies', label: 'الموردين' },
  { href: '/chat', label: 'شات الذكاء الاصطناعي' },

  { href: '/settings', label: 'الإعدادات' },
  { href: '/documentation', label: 'دليل الإستخدام' },

];

const Sidebar = () => {
  const pathname = usePathname();
  const [pharmacyName, setPharmacyName] = React.useState("Smart Pharma");
  const [open, setOpen] = React.useState(true);

  const dispatch = useDispatch();
  const darkMode = useSelector((state) => state.ui.darkMode);


  React.useEffect(() => {
    const loadInfo = () => {
      const saved = localStorage.getItem("pharmacy-info");
      if (saved) {
        const info = JSON.parse(saved);
        console.log(info);
        if (info.name) setPharmacyName(info.name);
      }
    };
    loadInfo();
    window.addEventListener('storage', loadInfo);
    return () => window.removeEventListener('storage', loadInfo);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <>
      {/* Mobile Toggle */}
      <IconButton
        onClick={() => setOpen(!open)}
        sx={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 1000,
          display: { xs: "flex", md: "none" },
          bgcolor: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(8px)",
        }}
      >
        <MenuIcon />
      </IconButton>

      <aside
        className={`h-screen flex flex-col p-3 transition-all duration-300 backdrop-blur-xl ${open ? "w-56" : "w-0"
          }`}
        style={{
          backgroundColor: "var(--glass-bg)",
          borderLeft: "1px solid var(--glass-border)",
          borderRadius: "24px 0 0 24px",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.02)",
          overflow: "hidden",
        }}
      >
        {/* Branding */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
          <img
            src="/شعار صيدلية عصري وبسيط بالأزرق والأخضر.gif"
            alt="Logo"
            width={170}
            height={170}
          />
        </Box>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-grow">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-base font-bold transition-all duration-200
                  ${isActive
                    ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20"
                    : "text-[var(--foreground)] opacity-70 hover:opacity-100 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <Box
          sx={{
            mt: "auto",
            pt: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1,
            borderTop: "1px solid var(--glass-border)",
          }}
        >
          <Tooltip title={darkMode ? "الوضع النهاري" : "الوضع الليلي"}>
            <IconButton
              size="small"
              onClick={() => dispatch(toggleDarkMode())}
              sx={{ color: "var(--foreground)" }}
            >
              {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <Tooltip title="خروج">
            <IconButton
              size="small"
              onClick={handleLogout}
              sx={{
                color: "var(--error)",
                "&:hover": { bgcolor: "rgba(229, 57, 53, 0.05)" },
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </aside>
    </>

  );
};

export default Sidebar;
