"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Megaphone,
  UserCheck,
  PhoneCall,
  Tag,
  FileText,
  Trophy,
  Settings,
  HelpCircle,
  BookOpen,
  LogOut,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "closer", "setter", "client"] },
  { href: "/dashboard/sales", label: "Sales Dashboard", icon: TrendingUp, roles: ["admin"] },
  { href: "/dashboard/ads", label: "Ads Dashboard", icon: Megaphone, roles: ["admin"] },
  { href: "/dashboard/setter", label: "Appointment Setter", icon: UserCheck, roles: ["admin", "setter"] },
  { href: "/dashboard/call-logs", label: "Call Logs", icon: PhoneCall, roles: ["admin", "closer"] },
  { href: "/dashboard/lead-tagging", label: "Lead Tagging", icon: Tag, roles: ["admin", "closer"] },
  { href: "/dashboard/reports", label: "Reports", icon: FileText, roles: ["admin"] },
  { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy, roles: ["admin", "closer"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

const bottomItems = [
  { href: "/help", label: "Help Center", icon: HelpCircle },
  { href: "/docs", label: "Documentation", icon: BookOpen },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string>("admin");

  useEffect(() => {
    const fetchRole = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role) setRole(profile.role);
    };
    fetchRole();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const visibleNav = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex flex-col w-[210px] min-h-screen bg-surface-low border-r border-border flex-shrink-0">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-on-surface leading-none">NEW SZN</p>
            <p className="text-[10px] text-on-surface-variant leading-none mt-0.5">Agency Dashboard</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-surface-high text-on-surface"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            )}
          >
            <Icon size={16} className={cn(isActive(href) ? "text-on-surface" : "text-on-surface-variant")} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="px-3 py-4 border-t border-border space-y-0.5">
        {bottomItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-danger hover:bg-surface-container transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
