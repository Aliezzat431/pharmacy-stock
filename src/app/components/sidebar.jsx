'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Payments as PaymentsIcon,
  Inventory as InventoryIcon,
  AssignmentReturn as ReturnsIcon,
  AccountBalance as DebtorsIcon,
  BarChart as DashboardIcon,
  Settings as SettingsIcon,
  Business as BusinessIcon, // new icon for companies
} from '@mui/icons-material';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';

const links = [
  { href: '/', label: 'الدفع', icon: <PaymentsIcon fontSize="small" /> },
  { href: '/stock', label: 'المخزون', icon: <InventoryIcon fontSize="small" /> },
  { href: '/returns', label: 'المرتجعات', icon: <ReturnsIcon fontSize="small" /> },
  { href: '/debtors', label: 'المدينون', icon: <DebtorsIcon fontSize="small" /> },
  { href: '/dashboard', label: 'الأرباح', icon: <DashboardIcon fontSize="small" /> },
  { href: '/companies', label: 'الشركات', icon: <BusinessIcon fontSize="small" /> },
  { href: '/settings', label: 'الإعدادات', icon: <SettingsIcon fontSize="small" /> },
];

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="w-52 h-screen bg-white dark:bg-zinc-900 text-black dark:text-white shadow-xl flex flex-col justify-between p-4 transition-all duration-300">
      <div className="flex flex-col gap-4">
     
        <h2 className="text-2xl font-bold text-center">الصيدلية</h2>

        <nav className="flex flex-col gap-2 mt-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${pathname === link.href
                ? 'bg-yellow-400 dark:bg-yellow-600 text-white'
                : 'text-black dark:text-white hover:bg-yellow-200 dark:hover:bg-yellow-800'
              }`}
            >
              {link.icon}
              <span className="text-sm">{link.label}</span>
            </Link>
          ))}
        </nav><div className="flex justify-center mt-2">
<Image src="/logo.png" alt="Logo" width={500} height={500} />
</div>
      </div>
    </aside>
  );
};

export default Sidebar;
