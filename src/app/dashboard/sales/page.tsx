"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  DollarSign, Target, TrendingUp, CreditCard,
  PhoneCall, X, Sparkles, Users, Percent, BarChart2,
  AlertCircle, CheckSquare
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { cn } from "@/lib/utils";
import type { Call, SalesKpis } from "@/lib/db/types";

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function pct(n: number) { return `${n.toFixed(1)}%`; }

const outcomeBadge: Record<string, string> = {
  closed:         "badge-closed",
  paid_in_full:   "badge-closed",
  split_pay:      "badge-closed",
  rescheduled:    "badge-rescheduled",
  lost:           "badge-lost",
  offer_declined: "badge-lost",
  not_a_fit:      "badge-lost",
  deposit_only:   "badge-rescheduled",
  noshow:         "badge-noshow",
  no_show:        "badge-noshow",
  cancelled:      "badge-noshow",
};
const outcomeLabel: Record<string, string> = {
  closed:         "Closed",
  paid_in_full:   "Paid in Full",
  split_pay:      "Split Pay",
  rescheduled:    "Rescheduled",
  lost:           "Lost",
  offer_declined: "Offer Declined",
  not_a_fit:      "Not a Fit",
  deposit_only:   "Deposit Only",
  noshow:         "No-Show",
  no_show:        "No-Show",
  cancelled:      "Cancelled",
};

const OUTCOME_COLORS: Record<string, string> = {
  closed: "#10B981", paid_in_full: "#10B981", split_pay: "#34d399",
  rescheduled: "#adc6ff", deposit_only: "#adc6ff",
  lost: "#EF4444", offer_declined: "#EF4444", not_a_fit: "#f87171",
  noshow: "#F59E0B", no_show: "#F59E0B", cancelled: "#fbbf24",
};

const ALL_OUTCOMES = [
  "paid_in_full", "split_pay", "offer_declined", "not_a_fit",
  "deposit_only", "no_show", "cancelled", "rescheduled",
];

interface LogPayload {
  lead_name: string;
  lead_source: string;
  outcome: string;
  revenue: number;
  cash_collected: number;
  notes: string;
  objection: string;
}

function LogCallModal({ onClose, onLog }: { onClose: () => void; onLog: (data: LogPayload) => Promise<void> }) {
  const [outcome, setOutcome] = useState("paid_in_full");
  const [leadName, setLeadName] = useState("");
  const [leadSource, setLeadSource] = useState("Facebook");
  const [revenue, setRevenue] = useState("");
  const [cashCollected, setCashCollected] = useState("");
  const [notes, setNotes] = useState("");
  const [objection, setObjection] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isWon = ["paid_in_full", "split_pay"].includes(outcome);
  const isLost = ["offer_declined", "not_a_fit", "deposit_only"].includes(outcome);

  const handleSubmit = async () => {
    if (!leadName.trim()) { setError("Lead name is required"); return; }
    setSaving(true);
    setError("");
    try {
      await onLog({
        lead_name: leadName,
        lead_source: leadSource,
        outcome,
        revenue: Number(revenue) || 0,
        cash_collected: Number(cashCollected) || 0,
        notes,
        objection,
      });
    } catch {
      setError("Failed to save call. Try again.");
      setSaving(false);
    }
  };

  const outcomeGroups = [
    { label: "Won", options: [{ value: "paid_in_full", label: "Paid in Full" }, { value: "split_pay", label: "Split Pay" }] },
    { label: "Showed", options: [{ value: "offer_declined", label: "Offer Declined" }, { value: "not_a_fit", label: "Not a Fit" }, { value: "deposit_only", label: "Deposit Only" }] },
    { label: "No-Show", options: [{ value: "no_show", label: "No-Show" }, { value: "cancelled", label: "Cancelled" }] },
    { label: "Other", options: [{ value: "rescheduled", label: "Rescheduled" }] },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-low border border-border rounded-lg w-full max-w-lg shadow-modal animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-on-surface">Log New Call</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
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
                {["Facebook", "Organic", "Referral", "Cold Outreach", "Instagram", "YouTube"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant">Outcome</label>
            <div className="space-y-2">
              {outcomeGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((o) => (
                      <button
                        key={o.value}
                        onClick={() => setOutcome(o.value)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-medium border transition-colors",
                          outcome === o.value
                            ? group.label === "Won" ? "bg-success/20 border-success text-success"
                              : group.label === "No-Show" || group.label === "Other" ? "bg-warning/20 border-warning text-warning"
                              : "bg-danger/20 border-danger text-danger"
                            : "bg-surface border-border text-on-surface-variant hover:border-outline"
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isWon && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-on-surface-variant">Deal Value ($)</label>
                <input
                  type="number"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                  className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-brand"
                  placeholder="e.g. 4800"
                />
              </div>
              {outcome === "split_pay" && (
                <div className="space-y-1.5">
                  <label className="text-xs text-on-surface-variant">Cash Collected Upfront ($)</label>
                  <input
                    type="number"
                    value={cashCollected}
                    onChange={(e) => setCashCollected(e.target.value)}
                    className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-brand"
                    placeholder="e.g. 1500"
                  />
                </div>
              )}
            </div>
          )}

          {isLost && (
            <div className="space-y-1.5">
              <label className="text-xs text-on-surface-variant">Main Objection</label>
              <select
                value={objection}
                onChange={(e) => setObjection(e.target.value)}
                className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand"
              >
                <option value="">Select objection…</option>
                <option value="money">Money / Price</option>
                <option value="time">Time / Timing</option>
                <option value="partner">Partner / Spouse</option>
                <option value="think about it">Think About It</option>
                <option value="fear">Fear / Risk</option>
                <option value="value">Value / Not Worth It</option>
                <option value="other">Other</option>
              </select>
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

function StatCard({ label, value, sub, icon: Icon, highlight }: {
  label: string; value: string; sub?: string; icon: React.ElementType; highlight?: "success" | "danger" | "warning";
}) {
  const valueColor = highlight === "success" ? "text-success" : highlight === "danger" ? "text-danger" : highlight === "warning" ? "text-warning" : "text-on-surface";
  return (
    <div className="bg-surface-low border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">{label}</span>
        <Icon size={13} className="text-on-surface-variant" />
      </div>
      <p className={cn("text-2xl font-bold font-mono", valueColor)}>{value}</p>
      {sub && <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SalesDashboard() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [kpis, setKpis] = useState<SalesKpis | null>(null);
  const [revenueChart, setRevenueChart] = useState<{ day: string; value: number }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/dashboard").then((r) => r.json()),
    ]).then(([sales, dash]) => {
      setCalls(sales.calls ?? []);
      setKpis(sales.kpis ?? null);
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
    load();
  };

  const outcomeCounts = calls.reduce<Record<string, number>>((acc, c) => {
    acc[c.outcome] = (acc[c.outcome] ?? 0) + 1;
    return acc;
  }, {});

  const pieData = ALL_OUTCOMES
    .filter((o) => (outcomeCounts[o] ?? 0) > 0)
    .map((o) => ({ name: outcomeLabel[o], value: outcomeCounts[o] ?? 0, color: OUTCOME_COLORS[o] }));

  const objections = kpis?.objections;
  const objectionItems = objections ? [
    { label: "Money / Price",  count: objections.money,          color: "#EF4444" },
    { label: "Think About It", count: objections.think_about_it, color: "#F59E0B" },
    { label: "Time / Timing",  count: objections.time,           color: "#adc6ff" },
    { label: "Partner",        count: objections.partner,        color: "#c084fc" },
    { label: "Fear / Risk",    count: objections.fear,           color: "#fb923c" },
    { label: "Value",          count: objections.value,          color: "#34d399" },
    { label: "Other",          count: objections.other,          color: "#8e9192" },
  ].filter((o) => o.count > 0) : [];

  const Skel = () => <div className="h-24 animate-pulse bg-surface-low border border-border rounded-lg" />;

  return (
    <DashboardLayout title="Dashboard > Sales">
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-on-surface">Sales Performance — This Month</h2>
            <p className="text-xs text-on-surface-variant">Formulas exclude no-shows from close rate denominator.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-primary text-on-primary text-xs font-semibold px-4 py-2.5 hover:bg-primary/90 transition-colors"
          >
            <PhoneCall size={13} />
            Log Call
          </button>
        </div>

        {/* Row 1 — Revenue, Cash, Deals Won/Lost, Close Rate */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skel key={i} />) : <>
            <StatCard label="Revenue"      value={fmt(kpis?.revenue ?? 0)}                             icon={DollarSign}  highlight="success" />
            <StatCard label="Cash Collected" value={fmt(kpis?.cash_collected ?? 0)}                   icon={CreditCard} />
            <StatCard label="Deals Won / Lost" value={`${kpis?.deals_won ?? 0} / ${kpis?.deals_lost ?? 0}`} icon={Target} sub="Won left, lost right" />
            <StatCard label="Close Rate"   value={pct(kpis?.close_rate ?? 0)}                         icon={Percent}     highlight={(kpis?.close_rate ?? 0) >= 30 ? "success" : "danger"} sub="Excludes no-shows" />
          </>}
        </div>

        {/* Row 2 — Show-Up Rate, Deposits, Rev/Call, Cash/Call */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skel key={i} />) : <>
            <StatCard label="Show-Up Rate"  value={pct(kpis?.show_up_rate ?? 0)}             icon={Users}      highlight={(kpis?.show_up_rate ?? 0) >= 70 ? "success" : "warning"} />
            <StatCard label="Deposits"      value={`${kpis?.deposits ?? 0}`}                  icon={AlertCircle} sub={fmt(kpis?.deposit_value ?? 0) + " est. value"} />
            <StatCard label="Rev / Call"    value={fmt(kpis?.revenue_per_call ?? 0)}           icon={TrendingUp} />
            <StatCard label="Cash / Call"   value={fmt(kpis?.cash_per_call ?? 0)}              icon={CreditCard} />
          </>}
        </div>

        {/* Row 3 — Cash Upfront %, PIF %, Avg Deal, Avg Cash */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skel key={i} />) : <>
            <StatCard label="Cash Upfront %" value={pct(kpis?.cash_upfront_pct ?? 0)}         icon={Percent}    sub="Cash ÷ Revenue" />
            <StatCard label="PIF %"           value={pct(kpis?.pif_pct ?? 0)}                  icon={CheckSquare} sub="Paid-in-full deals" />
            <StatCard label="Avg Deal"        value={fmt(kpis?.avg_deal ?? 0)}                  icon={BarChart2} />
            <StatCard label="Avg Cash"        value={fmt(kpis?.avg_cash ?? 0)}                  icon={DollarSign} />
          </>}
        </div>

        {/* Objection Counters */}
        {!loading && objectionItems.length > 0 && (
          <div className="bg-surface-low border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-on-surface mb-4">Objection Breakdown</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {objectionItems.map((o) => (
                <div key={o.label} className="bg-surface border border-border rounded p-3 text-center">
                  <p className="text-2xl font-bold font-mono" style={{ color: o.color }}>{o.count}</p>
                  <p className="text-[10px] text-on-surface-variant mt-1 leading-tight">{o.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <tr key={call.id} className="hover:bg-surface-container transition-colors">
                    <td className="py-2.5 text-xs text-on-surface-variant font-mono">{call.call_time ? call.call_time.slice(0, 5) : "—"}</td>
                    <td className="py-2.5 text-sm text-on-surface">{call.lead_name}</td>
                    <td className="py-2.5 text-xs text-on-surface-variant hidden md:table-cell">{call.lead_source}</td>
                    <td className="py-2.5">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5", outcomeBadge[call.outcome] ?? "badge-lost")}>
                        {outcomeLabel[call.outcome] ?? call.outcome}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-sm font-mono text-on-surface">{call.revenue > 0 ? fmt(call.revenue) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-low border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-on-surface mb-4">Daily Revenue (7d)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueChart.length ? revenueChart : [{ day: "—", value: 0 }]}>
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
            <h2 className="text-sm font-semibold text-on-surface mb-4">Call Outcomes — Today</h2>
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
      {showModal && <LogCallModal onClose={() => setShowModal(false)} onLog={handleLog} />}
    </DashboardLayout>
  );
}
