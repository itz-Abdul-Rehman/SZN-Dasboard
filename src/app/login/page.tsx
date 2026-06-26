"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Zap, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Logo */}
      <div className="mb-8 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-8 h-8 bg-brand flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">NEW SZN</h1>
        <p className="text-xs tracking-[0.25em] text-on-surface-variant mt-1 uppercase">Performance Agency Portal</p>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm animate-fade-in">
        <div className="bg-surface-low border border-border rounded-lg p-7 shadow-modal">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface-variant">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="email"
                  placeholder="name@agency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "w-full bg-surface border border-border rounded pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant",
                    "focus:outline-none focus:border-brand transition-colors"
                  )}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface-variant">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "w-full bg-surface border border-border rounded pl-10 pr-10 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant",
                    "focus:outline-none focus:border-brand transition-colors"
                  )}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full bg-primary text-on-primary font-semibold text-sm py-2.5 rounded transition-all",
                "hover:bg-primary/90",
                loading && "opacity-60 cursor-not-allowed"
              )}
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] tracking-[0.2em] text-on-surface-variant uppercase">Authorized Access</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>

      {/* System status */}
      <div className="absolute bottom-5 left-5 flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 bg-success animate-pulse" />
        <span className="text-[10px] text-on-surface-variant">System: Operational</span>
      </div>
    </div>
  );
}
