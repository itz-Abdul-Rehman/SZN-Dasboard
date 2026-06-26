"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  MessageSquare, Reply, Send, PhoneCall, RefreshCw, TrendingUp,
  Plus, X, Download, Pencil
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { cn } from "@/lib/utils";
import type { SetterLog } from "@/lib/db/types";

function HeatCell({ value }: { value: number }) {
  const opacity = value === 0 ? 0.05 : value < 5 ? 0.2 : value < 10 ? 0.45 : value < 15 ? 0.7 : 0.95;
  return (
    <div className="aspect-square" style={{ background: `rgba(16, 185, 129, ${opacity})` }} title={`${value} bookings`} />
  );
}

function LogDayModal({ onClose, onSave }: { onClose: () => void; onSave: (data: Record<string, number>) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({ conversations: "", replies: "", proposals: "", calls_booked: "", follow_ups: "" });

  async function handleSave() {
    setSaving(true);
    await onSave(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, Number(v) || 0])));
    setSaving(false);
    onClose();
  }

  const labels: Record<string, string> = {
    conversations: "Conversations", replies: "Replies",
    proposals: "Proposals Sent", calls_booked: "Calls Booked", follow_ups: "Follow-Ups",
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-low border border-border rounded-lg w-full max-w-md shadow-modal animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-on-surface">Log Today&apos;s Activity</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {Object.keys(fields).map((key) => (
              <div key={key} className="space-y-1.5">
                <label className="text-xs text-on-surface-variant">{labels[key]}</label>
                <input
                  type="number" min="0"
                  value={fields[key as keyof typeof fields]}
                  onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="flex-1 border border-border text-on-surface-variant text-sm py-2.5 hover:bg-surface-container transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-on-primary font-semibold text-sm py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-60">
            {saving ? "Saving…" : "Save Day"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SetterDashboard() {
  const [logs, setLogs] = useState<SetterLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    fetch("/api/setter")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function handleLogDay(data: Record<string, number>) {
    await fetch("/api/setter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchLogs();
  }

  const today = logs[0] ?? null;
  const convRate = today && today.conversations > 0
    ? ((today.calls_booked / today.conversations) * 100).toFixed(1)
    : "0.0";

  const metricCards = [
    { label: "Conversations Today", value: today?.conversations ?? 0, icon: MessageSquare },
    { label: "Replies Today",        value: today?.replies       ?? 0, icon: Reply },
    { label: "Proposals Sent",       value: today?.proposals     ?? 0, icon: Send },
    { label: "Calls Booked",         value: today?.calls_booked  ?? 0, icon: PhoneCall },
  ];

  const bookingTrend = [...logs].reverse().slice(-8).map((l) => ({
    day: new Date(l.log_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
    confirmed: l.calls_booked,
    noshow: 0,
  }));

  const heatmapData = Array.from({ length: 30 }, (_, i) => {
    const log = logs[i];
    return log ? log.calls_booked : 0;
  });

  return (
    <DashboardLayout title="Dashboard > Setter">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">Performance Overview</h2>
            <p className="text-xs text-on-surface-variant">Tracking real-time outreach and conversion velocity.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary text-xs font-semibold px-4 py-2.5 hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Log Activity
          </button>
        </div>

        {/* Metric Cards */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse bg-surface-low border border-border rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {metricCards.map((m) => (
              <div key={m.label} className="bg-surface-low border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">{m.label}</span>
                  <m.icon size={14} className="text-on-surface-variant" />
                </div>
                <span className="text-2xl font-bold text-on-surface font-mono">{m.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Follow-ups + Conv Rate + Growth */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-surface-low border border-border rounded-lg p-4 flex items-center gap-4">
            <RefreshCw size={20} className="text-on-surface-variant flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">Follow-Ups</p>
              <p className="text-2xl font-bold text-on-surface font-mono">{today?.follow_ups ?? 0}</p>
            </div>
          </div>
          <div className="bg-surface-low border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">Conv Rate</p>
              <span className="text-sm font-bold text-on-surface">{convRate}%</span>
            </div>
            <div className="h-2 bg-surface-high overflow-hidden">
              <div className="h-full bg-success" style={{ width: `${Math.min(parseFloat(convRate), 100)}%` }} />
            </div>
          </div>
          <div className="bg-surface-low border border-border rounded-lg p-4 flex items-center gap-4">
            <TrendingUp size={20} className="text-success flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">Total Booked (30d)</p>
              <p className="text-2xl font-bold text-on-surface font-mono">
                {logs.reduce((s, l) => s + (l.calls_booked ?? 0), 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-low border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-on-surface">Booking Trend</h2>
              <span className="text-xs text-on-surface-variant">Last {bookingTrend.length} days</span>
            </div>
            {bookingTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={bookingTrend}>
                  <defs>
                    <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e5e2e1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#e5e2e1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#8e9192", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8e9192", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1c1b1b", border: "1px solid #2a2a2a", borderRadius: 0, fontSize: 12 }} />
                  <Area type="monotone" dataKey="confirmed" stroke="#e5e2e1" strokeWidth={2} fill="url(#confGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-on-surface-variant">No booking data yet.</div>
            )}
          </div>

          <div className="bg-surface-low border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-on-surface">30-Day Heatmap</h2>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
              {heatmapData.map((v, i) => <HeatCell key={i} value={v} />)}
            </div>
            <div className="flex items-center justify-between mt-3 text-[10px] text-on-surface-variant">
              <span>Less</span>
              <div className="flex gap-1">
                {[0.05, 0.2, 0.45, 0.7, 0.95].map((o, i) => (
                  <div key={i} className="w-3 h-3" style={{ background: `rgba(16, 185, 129, ${o})` }} />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Daily Activity Log Table */}
        <div className="bg-surface-low border border-border rounded-lg">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="text-sm font-semibold text-on-surface">Daily Activity Log</h2>
            <button className="flex items-center gap-1.5 border border-border text-on-surface-variant text-xs px-3 py-1.5 hover:bg-surface-container transition-colors">
              <Download size={12} /> Export
            </button>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse bg-surface-high rounded" />)}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] text-on-surface-variant uppercase tracking-wider border-b border-border">
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                    <th className="text-right px-3 py-3 font-medium">Conv</th>
                    <th className="text-right px-3 py-3 font-medium hidden md:table-cell">Replies</th>
                    <th className="text-right px-3 py-3 font-medium hidden md:table-cell">Props</th>
                    <th className="text-right px-3 py-3 font-medium">Booked</th>
                    <th className="text-right px-3 py-3 font-medium hidden sm:table-cell">F-Ups</th>
                    <th className="text-right px-3 py-3 font-medium">Rate</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-on-surface-variant">No activity logged yet. Click &quot;Log Activity&quot; to start.</td></tr>
                  )}
                  {logs.map((row) => {
                    const rate = row.conversations > 0 ? ((row.calls_booked / row.conversations) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={row.id} className="hover:bg-surface-container transition-colors group">
                        <td className="px-5 py-3 text-sm text-on-surface">
                          {new Date(row.log_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-on-surface-variant">{row.conversations}</td>
                        <td className="px-3 py-3 text-right text-sm text-on-surface-variant hidden md:table-cell">{row.replies}</td>
                        <td className="px-3 py-3 text-right text-sm text-on-surface-variant hidden md:table-cell">{row.proposals}</td>
                        <td className={cn("px-3 py-3 text-right text-sm font-semibold", row.calls_booked >= 7 ? "text-success" : row.calls_booked >= 4 ? "text-warning" : "text-danger")}>
                          {row.calls_booked}
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-on-surface-variant hidden sm:table-cell">{row.follow_ups}</td>
                        <td className="px-3 py-3 text-right text-sm text-on-surface-variant">{rate}%</td>
                        <td className="px-3 py-3 text-right">
                          <button className="text-on-surface-variant hover:text-on-surface transition-colors opacity-0 group-hover:opacity-100">
                            <Pencil size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-5 py-3 border-t border-border">
            <span className="text-xs text-on-surface-variant">Showing {Math.min(logs.length, 30)} of {logs.length} days</span>
          </div>
        </div>

      </div>

      {showModal && <LogDayModal onClose={() => setShowModal(false)} onSave={handleLogDay} />}
    </DashboardLayout>
  );
}
