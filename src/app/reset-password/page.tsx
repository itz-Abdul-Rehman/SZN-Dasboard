"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Zap, Eye, EyeOff, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Expired/used-link recovery: if the URL hash carries an auth error, show a
  // "request a fresh link" panel instead of a broken form.
  const [expired, setExpired] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resent, setResent] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("error_code")) {
      setExpired(true);
    }
  }, []);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResent("");
    if (!resendEmail) { setError("Enter your email."); return; }
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(resendEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) setError(err.message);
    else { setError(""); setResent("New reset link sent — open the newest email and click it promptly."); }
  };

  // When the user arrives from the reset email, Supabase establishes a recovery
  // session from the URL automatically (detectSessionInUrl), so updateUser works.
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) { setError(updateError.message); return; }
    setDone(true);
    setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1500);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-8 h-8 bg-brand flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Reset Password</h1>
        <p className="text-xs tracking-[0.2em] text-on-surface-variant mt-1 uppercase">Choose a new password</p>
      </div>

      <div className="w-full max-w-sm">
        <div className="bg-surface-low border border-border rounded-lg p-7 shadow-modal">
          {expired ? (
            <form onSubmit={handleResend} className="space-y-4">
              <p className="text-sm text-on-surface font-medium">This reset link expired or was already used.</p>
              <p className="text-xs text-on-surface-variant">Enter your email to get a fresh link, then open the <strong>newest</strong> email and click it right away.</p>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input type="email" required placeholder="you@email.com" value={resendEmail} onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full bg-surface border border-border rounded pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-brand" />
              </div>
              {error && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded px-3 py-2">{error}</p>}
              {resent && <p className="text-xs text-success bg-success/10 border border-success/20 rounded px-3 py-2">{resent}</p>}
              <button type="submit" className="w-full bg-primary text-on-primary font-semibold text-sm py-2.5 rounded hover:bg-primary/90 transition-all">Send new reset link</button>
            </form>
          ) : done ? (
            <p className="text-sm text-success text-center">Password updated. Redirecting…</p>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              {[
                { label: "New Password", value: password, set: setPassword },
                { label: "Confirm Password", value: confirm, set: setConfirm },
              ].map((f) => (
                <div key={f.label} className="space-y-1.5">
                  <label className="text-xs font-medium text-on-surface-variant">{f.label}</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type={show ? "text" : "password"}
                      placeholder="••••••••"
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      className={cn(
                        "w-full bg-surface border border-border rounded pl-10 pr-10 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant",
                        "focus:outline-none focus:border-brand transition-colors"
                      )}
                      required
                    />
                  </div>
                </div>
              ))}

              <button type="button" onClick={() => setShow(!show)} className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface">
                {show ? <EyeOff size={13} /> : <Eye size={13} />} {show ? "Hide" : "Show"} passwords
              </button>

              {error && (
                <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full bg-primary text-on-primary font-semibold text-sm py-2.5 rounded transition-all hover:bg-primary/90",
                  loading && "opacity-60 cursor-not-allowed"
                )}
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
