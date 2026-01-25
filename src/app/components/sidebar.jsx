'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { Typography, Box, IconButton, Tooltip } from '@mui/material';

const links = [
  { href: '/', label: 'كاشير المبيعات' },
  { href: '/stock', label: 'إدارة المخزون' },
  { href: '/restock', label: 'إضافة رصيد' },
  { href: '/returns', label: 'مرتجع مبيعات' },
  { href: '/debtors', label: 'حسابات العملاء' },
  { href: '/inventory-report', label: 'النواقص والانتهاء' },
  { href: '/dashboard', label: 'تقارير الأرباح' },
  { href: '/companies', label: 'الموردين' },
  { href: '/settings', label: 'الإعدادات' },
    { href: '/documentation', label: 'دليل الإستخدام' },

];

const Sidebar = () => {
  const pathname = usePathname();
  const [pharmacyName, setPharmacyName] = React.useState("Smart Pharma");

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
    <aside
      className="w-60 h-screen flex flex-col p-5 transition-all duration-300 backdrop-blur-xl"
      style={{
        backgroundColor: "var(--glass-bg)",
        borderLeft: "1px solid var(--glass-border)",
        borderRadius: "24px 0 0 24px",
        boxShadow: "-10px 0 30px rgba(0,0,0,0.02)"
      }}
    >
      {/* Branding */}
      <Box sx={{ mb: 6, display: 'flex', alignItems: 'center', gap: 2, px: 2 }}>
<img
  src="https://media.istockphoto.com/id/1313889711/vector/pharmacy-logo-icon-design-vector.jpg?s=612x612&w=0&k=20&c=VCXSKZSViMbf3eXYZ8EeUqJmuw67M13H1MehDvR3wxI="
  alt="Logo"
  width={45}
  height={45}
/>
        <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2 }}>
          {pharmacyName}
        </Typography>
      </Box>

      {/* Navigation */}
      <nav className="flex flex-col gap-1.5 flex-grow">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200
                ${isActive
                  ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                  : 'text-[var(--foreground)] opacity-70 hover:opacity-100 hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]'
                }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Compact Footer */}
      <Box sx={{
        mt: 'auto',
        pt: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        borderTop: '1px solid var(--glass-border)'
      }}>
 
        <Tooltip title="خروج">
          <IconButton
            size="small"
            onClick={handleLogout}
            sx={{ color: 'var(--error)', '&:hover': { bgcolor: 'rgba(229, 57, 53, 0.05)' } }}
          >
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </aside>
  );
};

export default Sidebar;
