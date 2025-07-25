'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const links = [
  { href: '/', label: 'الدفع' },
  { href: '/stock', label: 'المخزون' },
  { href: '/returns', label: 'المرتجعات' },
  { href: '/debtors', label: 'المدينون' },
  { href: '/dashboard', label: 'الأرباح' },
];



const Sidebar = () => {
  const pathname = usePathname();


  return (
<aside className="w-52 h-screen bg-white dark:bg-zinc-900 text-black dark:text-white shadow-xl flex flex-col justify-between p-4 transition-all duration-300">
  <div className="flex flex-col gap-4">
    <h2 className="text-2xl font-bold text-center mt-2">الصيدلية</h2>

    <nav className="flex flex-col gap-2 mt-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`block px-4 py-2 rounded-lg text-center font-medium transition-all duration-200
            ${
              pathname === link.href
                ? 'bg-yellow-400 dark:bg-yellow-600 text-white'
                : 'text-black dark:text-white hover:bg-yellow-200 dark:hover:bg-yellow-800'
            }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>

  </div>
</aside>

  );
};

export default Sidebar;
