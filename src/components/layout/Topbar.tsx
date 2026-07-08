"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TopbarProps {
  title: string;
  subtitle?: string;
  role?: string;
  userName?: string;
}

export default function Topbar({ title, subtitle, role = "Admin", userName = "Admin User" }: TopbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [liveUser, setLiveUser] = useState<{ name: string; role: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();
      if (profile) setLiveUser({ name: profile.full_name, role: profile.role });
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = liveUser?.name ?? userName;
  const displayRole = liveUser?.role ?? role;
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-surface-low flex-shrink-0">
      <div>
        <h1 className="text-sm font-semibold text-on-surface">{title}</h1>
        {subtitle && <p className="text-xs text-on-surface-variant">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* User profile dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-surface-container transition-colors"
          >
            <div className="w-7 h-7 bg-brand flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-semibold text-white">{initials}</span>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-on-surface leading-none">{displayName}</p>
              <p className="text-[10px] text-on-surface-variant leading-none mt-0.5 capitalize">{displayRole}</p>
            </div>
            <ChevronDown size={13} className="text-on-surface-variant" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-surface-low border border-border shadow-modal z-50">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-semibold text-on-surface truncate">{displayName}</p>
                <p className="text-[10px] text-on-surface-variant capitalize">{displayRole}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); router.push("/dashboard/settings"); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <User size={13} />
                Profile &amp; Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-danger hover:bg-danger/10 transition-colors border-t border-border"
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
