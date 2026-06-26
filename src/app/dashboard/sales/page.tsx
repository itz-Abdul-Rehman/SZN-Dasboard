"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import KpiCard from "@/components/dashboard/KpiCard";
import {
  DollarSign, Phone, Target, TrendingUp,
  Lock, PhoneCall, X, Sparkles
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { cn } from "@/lib/utils";
import type { Call } from "@/lib/db/types";

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

const outcomeBadge: Record<string, string> = {
  closed: "badge-closed",
  rescheduled: "badge-rescheduled",
  lost: "badge-lost",
  noshow: "badge-noshow",
};
const outcomeLabel: Record<string, string> = {
  closed: "Closed", rescheduled: "Rescheduled", lost: "Lost", noshow: "No-Show",
};

const OUTCOME_COLORS: Record<string, string> = {
  closed: "#10B981", rescheduled: "#adc6ff", lost: "#EF4444", noshow: "#F59E0B",
};

function LogCallModal({ onClose, onLog }: { onClose: () => void; onLog: (data: LogPayload) => Promise<void> }) {
  const [outcome, setOutcome] = useState("closed");
  const [leadName, setLeadName] = useState("");
  const [leadSource, setLeadSource] = useState("Facebook");
  const [revenue, setRevenue] = useState("");
  const [notes, setNotes] = useState("");
  const [objection, setObjection] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!leadName.trim()) { setError("Lead name is required"); return; }
    setSaving(true);
    setError("");
    try {
      await onLog({ lead_name: leadName, lead_source: leadSource, outcome, revenue: Number(revenue) || 0, notes, objection });
    } catch {
      setError("Failed to save call. Try again.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-low border border-border rounded-lg w-full max-w-md shadow-modal animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-on-surface">Log New Call</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-on-surface-variant">Lead Name</label>
              <input
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-brand"
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-on-surface-variant">Lead Source</label>
              <select
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand"
              >
                <option>Facebook</option>
                <option>Organic</option>
                <option>Referral</option>
                <option>Cold Outreach</option>
                <option>Instagram</option>
                <option>YouTube</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant">Outcome</label>
            <div className="grid grid-cols-4 gap-2">
              {["closed", "rescheduled", "lost", "noshow"].map((o) => (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className={cn(
                    "py-2 text-xs font-medium border transition-colors",
                    outcome === o
                      ? o === "closed" ? "bg-success/20 border-success text-success"
                        : o === "lost" || o === "noshow" ? "bg-danger/20 border-danger text-danger"
                        : "bg-brand/20 border-brand text-secondary"
                      : "bg-surface border-border text-on-surface-variant hover:border-outline"
                  )}
                >
                  {outcomeLabel[o]}
                </button>
              ))}
            </div>
          </div>
          {outcome === "closed" && (
            <div className="space-y-1.5">
              <label className="text-xs text-on-surface-variant">Revenue Closed ($)</label>
              <input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-brand"
                placeholder="e.g. 4800"
              />
            </div>
          )}
          {(outcome === "lost" || outcome === "noshow") && (
            <div className="space-y-1.5">
              <label className="text-xs text-on-surface-variant">Main Objection</label>
              <input
                value={objection}
                onChange={(e) => setObjection(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-brand"
                placeholder="e.g. Price, Timing, Not interested"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant">Call Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-brand resize-none"
              placeholder="What happened on the call?"
            />
          </div>
          {error && <p className="text-xs text-danger bg-danger/10 border border-danger/20 px-3 py-2">{error}</p>}
        </div>
        <div className="flex gap-3 p-5 border-t border-border">
          <button onClick={onClose} className="flex-1 border border-border text-on-surface-variant text-sm py-2.5 hover:bg-surface-container transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={cn("flex-1 bg-primary text-on-primary font-semibold text-sm py-2.5 hover:bg-primary/90 transition-colors", saving && "opacity-60")}
          >
            {saving ? "Saving..." : "Save Call"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface LogPayload {
  lead_name: string;
  lead_source: string;
  outcome: string;
  revenue: number;
  notes: string;
  objection: string;
}

export default function SalesDashboard() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [kpis, setKpis] = useState({ revenue: 0, calls_today: 0, close_rate: 0, avg_deal_size: 0 });
  const [revenueChart, setRevenueChart] = useState<{ day: string; value: number }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLoggedCall, setHasLoggedCall] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/dashboard").then((r) => r.json()),
    ]).then(([sales, dash]) => {
      setCalls(sales.calls ?? []);
      setKpis(sales.kpis);
      if ((sales.calls ?? []).length > 0) setHasLoggedCall(true);
      setRevenueChart(dash.revenueChart ?? []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLog = async (payload: LogPayload) => {
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: null, ...payload }),
    });
    if (!res.ok) throw new Error("Failed");
    setShowModal(false);
    setHasLoggedCall(true);
    load();
  };

  const salesKpis = [
    { label: "Today's Revenue", value: fmt(kpis.revenue),                    trend: "12%",  trendUp: true,  icon: DollarSign },
    { label: "Calls Today",     value: String(kpis.calls_today),             trend: "3",    trendUp: true,  icon: Phone },
    { label: "Close Rate",      value: `${kpis.close_rate.toFixed(1)}%`,     trend: "2.1%", trendUp: true,  icon: Target },
    { label: "Avg Deal Size",   value: fmt(kpis.avg_deal_size),              trend: "5%",   trendUp: true,  icon: TrendingUp },
  ];

  const outcomeCounts = calls.reduce<Record<string, number>>((acc, c) => {
    acc[c.outcome] = (acc[c.outcome] ?? 0) + 1;
    return acc;
  }, {});

  const pieData = ["closed", "rescheduled", "lost", "noshow"]
    .filter((o) => (outcomeCounts[o] ?? 0) > 0)
    .map((o) => ({ name: outcomeLabel[o], value: outcomeCounts[o] ?? 0, color: OUTCOME_COLORS[o] }));

  const revenueByDay = revenueChart.length
    ? revenueChart
    : [{ day: "—", value: 0 }];

  return (
    <DashboardLayout title="Dashboard > Sales" userName="Alex Riviera" role="Closer">
      <div className="relative animate-fade-in">
        {!hasLoggedCall && !loading && (
          <>
            <div className="absolute inset-0 backdrop-blur-md bg-surface/40 z-10" />
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="bg-surface-low border border-border rounded-lg p-8 text-center shadow-modal max-w-sm w-full animate-fade-in">
                <div className="w-12 h-12 border border-border flex items-center justify-center mx-auto mb-4">
                  <Lock size={20} className="text-on-surface-variant" />
                </div>
                <h3 className="text-base font-semibold text-on-surface mb-2">Unlock Full Insights</h3>
                <p className="text-sm text-on-surface-variant mb-6">Log your first sales call today to unlock the full dashboard view.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary font-semibold text-sm py-2.5 hover:bg-primary/90 transition-colors"
                >
                  <PhoneCall size={16} />
                  Log New Call
                </button>
              </div>
            </div>
          </>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {salesKpis.map((kpi) => (
              <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} trend={kpi.trend} trendUp={kpi.trendUp} icon={kpi.icon} />
            ))}
          </div>

          {/* Today's Call Log */}
          <div className="bg-surface-low border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-on-surface">Today&apos;s Call Log</h2>
                <p className="text-xs text-on-surface-variant">{calls.length} calls logged today</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 bg-primary text-on-primary text-xs font-semibold px-3 py-2 hover:bg-primary/90 transition-colors"
              >
                <PhoneCall size={13} />
                Log Call
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 animate-pulse bg-surface-high rounded" />)}</div>
            ) : calls.length === 0 ? (
              <p className="text-xs text-on-surface-variant py-4 text-center">No calls logged today yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] text-on-surface-variant uppercase tracking-wider border-b border-border">
                    <th className="text-left pb-2 font-medium">Time</th>
                    <th className="text-left pb-2 font-medium">Lead</th>
                    <th className="text-left pb-2 font-medium hidden md:table-cell">Source</th>
                    <th className="text-left pb-2 font-medium">Outcome</th>
                    <th className="text-right pb-2 font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {calls.map((call) => (
                    <tr key={call.id} className="cursor-pointer hover:bg-surface-container transition-colors">
                      <td className="py-2.5 text-xs text-on-surface-variant font-mono">
                        {call.call_time ? call.call_time.slice(0, 5) : "—"}
                      </td>
                      <td className="py-2.5 text-sm text-on-surface">{call.lead_name}</td>
                      <td className="py-2.5 text-xs text-on-surface-variant hidden md:table-cell">{call.lead_source}</td>
                      <td className="py-2.5">
                        <span className={cn("text-[11px] font-medium px-2 py-0.5", outcomeBadge[call.outcome])}>
                          {outcomeLabel[call.outcome]}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-sm font-mono text-on-surface">
                        {call.revenue > 0 ? fmt(call.revenue) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-surface-low border border-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-on-surface mb-4">Daily Revenue</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#8e9192", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8e9192", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip contentStyle={{ background: "#1c1b1b", border: "1px solid #2a2a2a", borderRadius: 0, fontSize: 12 }} formatter={(v: any) => [`$${(v / 1000).toFixed(1)}k`]} />
                  <Bar dataKey="value" fill="#10B981" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-surface-low border border-border rounded-lg p-5">
              <h2 className="text-sm font-semibold text-on-surface mb-4">Call Outcomes</h2>
              {pieData.length === 0 ? (
                <p className="text-xs text-on-surface-variant py-4 text-center">Log calls to see outcomes.</p>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 flex-shrink-0" style={{ background: item.color }} />
                          <span className="text-xs text-on-surface-variant">{item.name}</span>
                        </div>
                        <span className="text-xs font-medium text-on-surface">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Loss Debrief */}
          <div className="bg-surface-low border border-border rounded-lg p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand/10 border border-brand/20 flex items-center justify-center">
                <Sparkles size={16} className="text-brand" />
              </div>
              <div>
                <p className="text-sm font-semibold text-on-surface">AI Loss Debrief</p>
                <p className="text-xs text-on-surface-variant">Analyze lost calls and get coaching recommendations.</p>
              </div>
            </div>
            <button className="flex-shrink-0 bg-brand text-white text-xs font-semibold px-4 py-2 hover:bg-brand/90 transition-colors">
              Generate Insights
            </button>
          </div>
        </div>
      </div>

      {showModal && <LogCallModal onClose={() => setShowModal(false)} onLog={handleLog} />}
    </DashboardLayout>
  );
}
