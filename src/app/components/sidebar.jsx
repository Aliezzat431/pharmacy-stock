"use client";
import React from "react";
import Image from "next/image";
import {
  LogOut,
  Moon,
  Sun,
  ShoppingCart,
  Undo2,
  Users,
  Truck,
  Sparkles,
  PlusCircle,
  Package,
  AlertTriangle,
  BarChart3,
  UserCog,
  History,
  Clock,
  Settings,
  BookOpen,
  User,
  BadgeDollarSign,
  ReceiptText,
  Menu
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toggleDarkMode } from "../../lib/redux/slices/uiSlice";
import { logoutUser } from "../../lib/redux/slices/authSlice";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const categories = [
  {
    id: "daily",
    label: "العمليات",
    icon: ShoppingCart,
    items: ["/", "/stock", "/returns", "/invoices", "/restock", "/debtors", "/chat"]
  },
  {
    id: "management",
    label: "الإدارة",
    icon: Users,
    items: ["/companies", "/payroll", "/employees"]
  },
  {
    id: "reports",
    label: "التقارير",
    icon: BarChart3,
    items: ["/inventory-report", "/dashboard", "/activities", "/sessions", "/settings", "/documentation"]
  }
];

const links = [
  { href: "/", label: "كاشير المبيعات", icon: ShoppingCart },
  { href: "/stock", label: "إدارة المخزون", icon: Package },
  { href: "/returns", label: "مرتجع مبيعات", icon: Undo2 },
  { href: "/invoices", label: "الفواتير", icon: ReceiptText },
  { href: "/restock", label: "إضافة رصيد", icon: PlusCircle },
  { href: "/debtors", label: "حسابات العملاء", icon: Users },
  { href: "/companies", label: "الموردين", icon: Truck },
  { href: "/chat", label: "شات الذكاء الاصطناعي", icon: Sparkles },
  { href: "/inventory-report", label: "النواقص والانتهاء", icon: AlertTriangle },
  { href: "/dashboard", label: "تقارير الأرباح", roles: ["master"], icon: BarChart3 },
  { href: "/employees", label: "الموظفين", roles: ["master"], icon: UserCog },
  { href: "/activities", label: "سجل النشاطات", roles: ["master"], icon: History },
  { href: "/sessions", label: "جلسات العمل", roles: ["master"], icon: Clock },
  { href: "/settings", label: "الإعدادات", icon: Settings },
  { href: "/documentation", label: "دليل الإستخدام", icon: BookOpen },
];

const Sidebar = ({ activeTab: providedActiveTab, onNavigate }) => {
  const [open, setOpen] = React.useState(true);

  const dispatch = useDispatch();
  const darkMode = useSelector((state) => state.ui.darkMode);
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = React.useState("daily");

  const displayLinks = React.useMemo(() => {
    const authorized = links.filter(
      (l) => !l.roles || l.roles.includes(user?.role)
    );

    if (user?.role === "master") {
      const idx = authorized.findIndex((l) => l.href === "/dashboard");
      if (idx !== -1) {
        authorized.splice(idx + 1, 0, {
          href: "/payroll",
          label: "المرتبات",
          icon: BadgeDollarSign
        });
      }
    }

    // Filter by active category
    const category = categories.find(c => c.id === activeTab);
    return authorized.filter(l => category?.items.includes(l.href));
  }, [user, activeTab]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    localStorage.removeItem("token");
    window.location.reload();
  };

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-[100] md:hidden glass-morphism"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <aside
        className={cn(
          "h-screen transition-all duration-500 ease-in-out border-l glass-morphism sticky top-0",
          open ? "w-80" : "w-0 p-0 overflow-hidden opacity-0"
        )}
        style={{
          borderRadius: "32px 0 0 32px",
        }}
      >
        <div className="flex flex-col h-full px-5 py-6">
        

          {/* Modern Category Selector */}
          <div className="relative flex justify-between gap-1 mb-8 p-1.5 rounded-[26px] bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl border border-white/30 dark:border-zinc-800 shadow-inner">
            {categories.map((cat) => {
              const isActive = activeTab === cat.id;
              const getCatColors = (id) => {
                switch(id) {
                  case 'daily': return { active: 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/40', text: 'text-emerald-500', hover: 'hover:text-emerald-600 hover:bg-emerald-500/10' };
                  case 'management': return { active: 'bg-gradient-to-tr from-blue-600 to-indigo-400 shadow-blue-500/40', text: 'text-blue-500', hover: 'hover:text-blue-600 hover:bg-blue-500/10' };
                  case 'reports': return { active: 'bg-gradient-to-tr from-violet-600 to-fuchsia-400 shadow-violet-500/40', text: 'text-purple-500', hover: 'hover:text-purple-600 hover:bg-purple-500/10' };
                  default: return { active: 'bg-primary shadow-primary/40', text: 'text-primary', hover: 'hover:text-primary' };
                }
              };
              const colors = getCatColors(cat.id);

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={cn(
                    "relative flex-1 flex flex-col items-center justify-center py-3 rounded-[22px] transition-all duration-500 ease-out z-10",
                    isActive 
                      ? "text-white scale-105" 
                      : `text-muted-foreground ${colors.hover} scale-100`
                  )}
                >
                  {isActive && (
                    <div className={cn("absolute inset-0 rounded-[22px] shadow-lg -z-10", colors.active)} />
                  )}
                  <cat.icon className={cn("h-5 w-5 mb-1.5 transition-transform duration-500", isActive && "scale-110 drop-shadow-md")} />
                  <span className="text-[10px] font-black tracking-widest leading-none drop-shadow-sm">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable Links */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
            {displayLinks.map((link) => {
              const active = providedActiveTab === link.href;
              const Icon = link.icon;
              return (
                <button
                  key={link.href}
                  onClick={() => onNavigate && onNavigate(link.href)}
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group w-full text-right",
                    active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-x-1"
                      : "text-foreground/70 hover:bg-primary/10 hover:text-primary hover:translate-x-1"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center p-2 rounded-xl",
                    active ? "bg-white/20" : "bg-muted group-hover:bg-primary/10"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-xs tracking-tight">{link.label}</span>
                  {active && (
                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse shadow-[0_0_8px_white]" />
                  )}
                </button>
              );
            })}
            {displayLinks.length === 0 && (
              <p className="text-center text-xs text-muted-foreground mt-8 opacity-50">
                لا توجد روابط في هذا التبويب
              </p>
            )}
          </div>

          {/* User Profile Card */}
          <div className="mt-6 pt-4 border-t">
            <div className="p-4 rounded-3xl bg-muted/40 border border-border/50 backdrop-blur-sm group transition-all duration-300 hover:bg-muted/60">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-xl shadow-primary/30">
                  {user?.username?.[0]?.toUpperCase() || "G"}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="font-black text-sm truncate tracking-tight uppercase">
                    {user?.username || "Guest"}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    {user?.role === 'master' ? 'مدير النظام' : 'صيدلي'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 rounded-xl h-10 shadow-sm"
                  onClick={() => dispatch(toggleDarkMode())}
                >
                  {darkMode ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-slate-700" />}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 rounded-xl h-10 shadow-sm"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
