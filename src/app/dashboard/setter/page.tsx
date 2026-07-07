"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  MessageSquare, Reply, Send, PhoneCall, RefreshCw,
  Plus, X, Download, Pencil, Flame, Zap
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { cn } from "@/lib/utils";
import type { SetterLog, SetterPeriodKpis, SetterAttribution } from "@/lib/db/types";

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
function pct(n: number) { return `${n.toFixed(1)}%`; }

function HeatCell({ value }: { value: number }) {
  const opacity = value === 0 ? 0.05 : value < 5 ? 0.2 : value < 10 ? 0.45 : value < 15 ? 0.7 : 0.95;
  return (
    <div className="aspect-square" style={{ background: `rgba(16, 185, 129, ${opacity})` }} title={`${value} bookings`} />
  );
}

function computeStreaks(logs: SetterLog[]) {
  if (!logs.length) return { current: 0, best: 0, total: 0, tier: "" };
  const dates = Array.from(new Set(logs.map((l) => l.log_date))).sort().reverse();
  let current = 0;
  let best = 0;
  let run = 0;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  let expecting = dates[0] === today || dates[0] === yesterday ? dates[0] : null;
  for (const d of dates) {
    if (d === expecting) {
      run++;
      const prev = new Date(expecting);
      prev.setDate(prev.getDate() - 1);
      expecting = prev.toISOString().split("T")[0];
    } else if (expecting !== null) {
      break;
    }
  }
  current = run;

  let tempRun = 0;
  let prevDateStr: string | null = null;
  for (const d of [...dates].reverse()) {
    if (!prevDateStr) { tempRun = 1; prevDateStr = d; continue; }
    const nextDay: Date = new Date(prevDateStr);
    nextDay.setDate(nextDay.getDate() + 1);
    if (d === nextDay.toISOString().split("T")[0]) { tempRun++; } else { tempRun = 1; }
    if (tempRun > best) best = tempRun;
    prevDateStr = d;
  }
  if (tempRun > best) best = tempRun;

  const tier = current >= 10 ? "LEGENDARY" : current >= 7 ? "ON FIRE" : current >= 4 ? "Hot" : current >= 2 ? "Warm" : "";
  return { current, best, total: dates.length, tier };
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
    conversations: "New Conversations", replies: "Responses (Replies)",
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

const emptyPeriod: SetterPeriodKpis = {
  conversations: 0, responses: 0, proposals: 0, calls_booked: 0, follow_ups: 0,
  pacing: 0, lead_response_pct: 0, proposal_response_pct: 0, call_proposal_pct: 0, call_lead_pct: 0,
};

export default function SetterDashboard() {
  const [logs, setLogs] = useState<SetterLog[]>([]);
  const [period, setPeriod] = useState<SetterPeriodKpis>(emptyPeriod);
  const [attribution, setAttribution] = useState<SetterAttribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    fetch("/api/setter")
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs ?? []);
        setPeriod(d.periodKpis ?? emptyPeriod);
        setAttribution(d.attribution ?? []);
      })
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

  const streaks = computeStreaks(logs);

  const bookingTrend = [...logs].reverse().slice(-8).map((l) => ({
    day: new Date(l.log_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
    confirmed: l.calls_booked,
  }));

  const heatmapData = Array.from({ length: 30 }, (_, i) => {
    const log = logs[i];
    return log ? log.calls_booked : 0;
  });

  const Skel = ({ h = "h-24" }: { h?: string }) => <div className={cn(h, "animate-pulse bg-surface-low border border-border rounded-lg")} />;

  const tierColor = streaks.tier === "LEGENDARY" ? "text-warning" : streaks.tier === "ON FIRE" ? "text-danger" : streaks.tier === "Hot" ? "text-brand" : "text-on-surface-variant";

  return (
    <DashboardLayout title="Dashboard > Setter">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">Setter Performance — This Month</h2>
            <p className="text-xs text-on-surface-variant">Tracking outreach funnel and conversion velocity.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-on-primary text-xs font-semibold px-4 py-2.5 hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            Log Activity
          </button>
        </div>

        {/* Row 1 — Volume KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {loading ? Array.from({ length: 5 }).map((_, i) => <Skel key={i} />) : [
            { label: "New Convos",     value: period.conversations, icon: MessageSquare },
            { label: "Responses",      value: period.responses,     icon: Reply },
            { label: "Proposals Sent", value: period.proposals,     icon: Send },
            { label: "Calls Booked",   value: period.calls_booked,  icon: PhoneCall },
            { label: "Follow-Ups",     value: period.follow_ups,    icon: RefreshCw },
          ].map((m) => (
            <div key={m.label} className="bg-surface-low border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">{m.label}</span>
                <m.icon size={13} className="text-on-surface-variant" />
              </div>
              <span className="text-2xl font-bold text-on-surface font-mono">{m.value.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Row 2 — Funnel % Rates + Pacing */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {loading ? Array.from({ length: 5 }).map((_, i) => <Skel key={i} h="h-20" />) : [
            { label: "Lead→Response %",  value: pct(period.lead_response_pct),    sub: `${period.responses} / ${period.conversations}` },
            { label: "Response→Prop %",  value: pct(period.proposal_response_pct), sub: `${period.proposals} / ${period.responses}` },
            { label: "Prop→Booked %",    value: pct(period.call_proposal_pct),     sub: `${period.calls_booked} / ${period.proposals}` },
            { label: "Lead→Booked %",    value: pct(period.call_lead_pct),         sub: "End-to-end rate" },
            { label: "Pacing (Calls)",   value: `${Math.round(period.pacing)}`,    sub: "Projected month-end" },
          ].map((s) => (
            <div key={s.label} className="bg-surface-low border border-border rounded-lg px-4 py-3">
              <p className="text-[10px] font-semibold tracking-widest text-on-surface-variant uppercase mb-1">{s.label}</p>
              <p className="text-xl font-bold text-on-surface font-mono">{s.value}</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Streaks */}
        <div className="bg-surface-low border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className={tierColor} />
            <h2 className="text-sm font-semibold text-on-surface">Activity Streaks</h2>
            {streaks.tier && (
              <span className={cn("text-[10px] font-bold tracking-widest border px-2 py-0.5 uppercase", tierColor,
                streaks.tier === "LEGENDARY" ? "border-warning/40 bg-warning/10"
                : streaks.tier === "ON FIRE" ? "border-danger/40 bg-danger/10"
                : streaks.tier === "Hot" ? "border-brand/40 bg-brand/10"
                : "border-border bg-surface"
              )}>{streaks.tier}</span>
            )}
          </div>
          {loading ? <div className="h-16 animate-pulse bg-surface-high rounded" /> : (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold font-mono text-on-surface">{streaks.current}</p>
                <p className="text-xs text-on-surface-variant mt-1">Current Streak</p>
                <p className="text-[10px] text-on-surface-variant">consecutive days</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold font-mono text-warning">{streaks.best}</p>
                <p className="text-xs text-on-surface-variant mt-1">Best Streak</p>
                <p className="text-[10px] text-on-surface-variant">all time</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold font-mono text-on-surface">{streaks.total}</p>
                <p className="text-xs text-on-surface-variant mt-1">Total Days</p>
                <p className="text-[10px] text-on-surface-variant">with activity</p>
              </div>
            </div>
          )}
        </div>

        {/* Charts */}
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

        {/* Setter Attribution Panel */}
        <div className="bg-surface-low border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={15} className="text-warning" />
            <h2 className="text-sm font-semibold text-on-surface">Setter Attribution</h2>
            <span className="text-xs text-on-surface-variant ml-1">Set → Close performance</span>
          </div>
          {loading ? <div className="h-20 animate-pulse bg-surface-high rounded" /> : attribution.length === 0 ? (
            <p className="text-xs text-on-surface-variant">No setter attribution data yet — populate <code className="text-on-surface bg-surface px-1 py-0.5">booked_by_setter_id</code> on call records to see this panel.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-on-surface-variant uppercase tracking-wider border-b border-border">
                  <th className="text-left pb-2 font-medium">Setter</th>
                  <th className="text-right pb-2 font-medium">Calls Set</th>
                  <th className="text-right pb-2 font-medium">Deals Closed</th>
                  <th className="text-right pb-2 font-medium">Revenue</th>
                  <th className="text-right pb-2 font-medium">Set→Close %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attribution.map((row) => (
                  <tr key={row.setter_id} className="hover:bg-surface-container transition-colors">
                    <td className="py-2.5 text-sm text-on-surface font-medium">{row.full_name}</td>
                    <td className="py-2.5 text-right text-sm text-on-surface-variant">{row.calls_set}</td>
                    <td className="py-2.5 text-right text-sm text-on-surface-variant">{row.deals_closed}</td>
                    <td className="py-2.5 text-right text-sm font-mono text-on-surface">{fmt(row.revenue)}</td>
                    <td className="py-2.5 text-right text-sm font-semibold text-success">{pct(row.set_close_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
                    <th className="text-right px-3 py-3 font-medium">Convos</th>
                    <th className="text-right px-3 py-3 font-medium hidden md:table-cell">Responses</th>
                    <th className="text-right px-3 py-3 font-medium hidden md:table-cell">Props</th>
                    <th className="text-right px-3 py-3 font-medium">Booked</th>
                    <th className="text-right px-3 py-3 font-medium hidden sm:table-cell">F-Ups</th>
                    <th className="text-right px-3 py-3 font-medium">Lead→Book %</th>
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
            <span className="text-xs text-on-surface-variant">Showing {Math.min(logs.length, 60)} of {logs.length} days</span>
          </div>
        </div>

      </div>

      {showModal && <LogDayModal onClose={() => setShowModal(false)} onSave={handleLogDay} />}
    </DashboardLayout>
  );
}
