"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import KpiCard from "@/components/dashboard/KpiCard";
import {
  DollarSign, Phone, Users, ShoppingCart, TrendingUp, Eye,
  Crosshair, MousePointerClick, RefreshCw, Sparkles, Filter,
  Search, MoreVertical, CheckCircle, PauseCircle, Archive, X
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import type { AdCampaign } from "@/lib/db/types";

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const statusIcon = {
  active:   <CheckCircle size={12} className="text-success" />,
  paused:   <PauseCircle size={12} className="text-warning" />,
  archived: <Archive size={12} className="text-on-surface-variant" />,
};

const statusBadge = {
  active:   "badge-active",
  paused:   "badge-paused",
  archived: "badge-archived",
};

function EfficiencyCell({ value }: { value: number }) {
  const bg = value > 70 ? "bg-success/70" : value > 40 ? "bg-surface-high" : "bg-danger/50";
  return <div className={cn("w-full h-full", bg)} title={`${value}%`} />;
}

const efficiencyData = [
  [80, 60, 90, 40], [30, 85, 20, 75], [60, 40, 70, 50], [45, 90, 35, 80],
];

export default function AdsDashboard() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [kpis, setKpis] = useState({ total_spend: 0, total_impressions: 0, total_results: 0, avg_roas: 0, avg_ctr: 0, cost_per_result: 0 });
  const [spendChart, setSpendChart] = useState<{ metric_date: string; ad_spend: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState("2h ago");
  const [syncCooldown, setSyncCooldown] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [narrativeOpen, setNarrativeOpen] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const load = useCallback(() => {
    fetch("/api/ads")
      .then((r) => r.json())
      .then((d) => {
        setCampaigns(d.campaigns ?? []);
        setKpis(d.kpis ?? kpis);
        setSpendChart(d.spendChart ?? []);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    if (syncCooldown) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/meta/sync", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setLastSynced(`just now — ${data.synced} campaign${data.synced !== 1 ? "s" : ""} synced`);
        load();
        // 15-minute cooldown
        setSyncCooldown(true);
        setTimeout(() => setSyncCooldown(false), 15 * 60 * 1000);
      } else {
        setLastSynced(`Sync failed: ${data.error ?? "unknown error"}`);
      }
    } catch {
      setLastSynced("Sync failed — check connection");
    } finally {
      setSyncing(false);
    }
  };

  const handleNarrative = async () => {
    setNarrative("");
    setNarrativeOpen(true);
    setNarrativeLoading(true);
    try {
      const res = await fetch("/api/ai/campaign-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) setNarrative((prev) => prev + decoder.decode(value));
      }
    } catch {
      setNarrative("AI unavailable — please try again.");
    } finally {
      setNarrativeLoading(false);
    }
  };

  const filtered = campaigns.filter((c) => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const chartData = spendChart.map((d) => ({
    day: new Date(d.metric_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: d.ad_spend,
  }));

  const adsKpis = [
    { label: "Ad Spend",    value: fmt(kpis.total_spend),                                        trend: "12.4%", trendUp: true,  icon: DollarSign },
    { label: "Cost/Call",   value: `$${kpis.cost_per_result.toFixed(2)}`,                        trend: "4.2%",  trendUp: false, icon: Phone },
    { label: "ROAS",        value: `${kpis.avg_roas.toFixed(1)}x`,                               trend: "0.4x",  trendUp: true,  icon: TrendingUp },
    { label: "Impr.",       value: kpis.total_impressions >= 1000000 ? `${(kpis.total_impressions / 1000000).toFixed(1)}M` : `${(kpis.total_impressions / 1000).toFixed(0)}K`, trend: "Static", trendUp: null, icon: Eye },
    { label: "Results",     value: String(kpis.total_results),                                   trend: "22%",   trendUp: true,  icon: CheckCircle },
    { label: "Avg CTR",     value: `${kpis.avg_ctr.toFixed(2)}%`,                                trend: "0.5%",  trendUp: false, icon: MousePointerClick },
    { label: "Cost/Result", value: `$${kpis.cost_per_result.toFixed(1)}`,                        trend: "$12.5", trendUp: false, icon: ShoppingCart },
    { label: "Reach",       value: campaigns.reduce((s, c) => s + c.reach, 0) >= 1000000 ? `${(campaigns.reduce((s, c) => s + c.reach, 0) / 1000000).toFixed(1)}M` : `${(campaigns.reduce((s, c) => s + c.reach, 0) / 1000).toFixed(0)}K`, trend: "15%", trendUp: true, icon: Crosshair },
    { label: "Cost/Follow", value: "$0.84",                                                      trend: "8.1%",  trendUp: true,  icon: Users },
    { label: "Cost/Cust",   value: "$285",                                                       trend: "2.5%",  trendUp: true,  icon: ShoppingCart },
    { label: "Freq.",       value: "—",                                                          trend: "Healthy", trendUp: null, icon: RefreshCw },
    { label: "CR %",        value: "5.82%",                                                      trend: "1.2%",  trendUp: true,  icon: TrendingUp },
  ];

  return (
    <DashboardLayout title="Dashboard > Ads" userName="Admin User" role="Admin">
      <div className="space-y-6 animate-fade-in">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <div key={i} className="bg-surface-low border border-border rounded-lg p-4 h-[88px] animate-pulse" />)
            : adsKpis.map((kpi) => (
                <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} trend={kpi.trend} trendUp={kpi.trendUp} icon={kpi.icon} />
              ))}
        </div>

        {/* Campaign Table */}
        <div className="bg-surface-low border border-border rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-on-surface">Campaign Performance</h2>
              <p className="text-xs text-on-surface-variant">Live data from Supabase.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="bg-surface border border-border pl-8 pr-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-brand w-44"
                />
              </div>
              <div className="flex items-center gap-1 bg-surface border border-border p-1">
                {(["all", "active", "paused", "archived"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                      statusFilter === s ? "bg-surface-high text-on-surface" : "text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <button className="p-1.5 border border-border text-on-surface-variant hover:text-on-surface transition-colors">
                <Filter size={14} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-5 space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse bg-surface-high rounded" />)}</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] text-on-surface-variant uppercase tracking-wider border-b border-border">
                    <th className="text-left px-5 py-3 font-medium">Name</th>
                    <th className="text-left px-3 py-3 font-medium">Status</th>
                    <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Category</th>
                    <th className="text-right px-3 py-3 font-medium">Spend</th>
                    <th className="text-right px-3 py-3 font-medium hidden lg:table-cell">Impressions</th>
                    <th className="text-right px-3 py-3 font-medium">Results</th>
                    <th className="text-right px-3 py-3 font-medium hidden lg:table-cell">CTR</th>
                    <th className="text-right px-3 py-3 font-medium">Cost/Res</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-container transition-colors group">
                      <td className="px-5 py-3 text-sm text-on-surface font-medium">{c.name}</td>
                      <td className="px-3 py-3">
                        <span className={cn("flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 w-fit", statusBadge[c.status as keyof typeof statusBadge])}>
                          {statusIcon[c.status as keyof typeof statusIcon]}
                          {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-on-surface-variant hidden md:table-cell">{c.category}</td>
                      <td className="px-3 py-3 text-right text-sm font-mono text-on-surface">{fmt(c.spend)}</td>
                      <td className="px-3 py-3 text-right text-sm text-on-surface-variant hidden lg:table-cell">
                        {c.impressions >= 1000000 ? `${(c.impressions / 1000000).toFixed(1)}M` : `${(c.impressions / 1000).toFixed(0)}K`}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-on-surface">{c.results}</td>
                      <td className="px-3 py-3 text-right text-sm text-on-surface-variant hidden lg:table-cell">{c.ctr.toFixed(1)}%</td>
                      <td className={cn("px-3 py-3 text-right text-sm font-mono", c.flagged ? "text-danger" : "text-on-surface")}>
                        {c.results > 0 ? `$${(c.spend / c.results).toFixed(2)}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button className="text-on-surface-variant hover:text-on-surface transition-colors opacity-0 group-hover:opacity-100">
                          <MoreVertical size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-low border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-on-surface">Daily Ad Spend</h2>
                <p className="text-xs text-on-surface-variant">Velocity across all channels.</p>
              </div>
              <span className="text-xs bg-surface-high text-on-surface-variant px-2 py-1">14D</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData.length ? chartData : [{ day: "—", value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#8e9192", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8e9192", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip contentStyle={{ background: "#1c1b1b", border: "1px solid #2a2a2a", borderRadius: 0, fontSize: 12 }} formatter={(v: any) => [`$${(v / 1000).toFixed(1)}k`]} />
                <Bar dataKey="value" fill="#3a3939" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-surface-low border border-border rounded-lg p-5">
            <div>
              <h2 className="text-sm font-semibold text-on-surface">Efficiency Heatmap</h2>
              <p className="text-xs text-on-surface-variant mb-4">ROI vs Spend distribution.</p>
            </div>
            <div className="grid grid-cols-4 gap-1.5" style={{ height: 160 }}>
              {efficiencyData.map((row, i) =>
                row.map((val, j) => <EfficiencyCell key={`${i}-${j}`} value={val} />)
              )}
            </div>
          </div>
        </div>

        {/* Sync + AI Insight */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-surface-low border border-border rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <RefreshCw size={16} className="text-on-surface-variant" />
              <div>
                <p className="text-sm font-medium text-on-surface">Synced</p>
                <p className="text-xs text-on-surface-variant">{lastSynced}</p>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing || syncCooldown}
              title={syncCooldown ? "Sync available again in 15 minutes" : ""}
              className={cn("bg-surface-high border border-border text-on-surface text-xs font-semibold px-4 py-2 transition-all hover:bg-surface-highest", (syncing || syncCooldown) && "opacity-50 cursor-not-allowed")}
            >
              {syncing ? "Syncing..." : syncCooldown ? "Cooldown" : "Sync"}
            </button>
          </div>
          <div className="bg-surface-low border border-border rounded-lg p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles size={16} className="text-brand mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-on-surface">Campaign Narrative</p>
                <p className="text-xs text-on-surface-variant">AI analysis of your ad performance and budget recommendations.</p>
              </div>
            </div>
            <button
              onClick={handleNarrative}
              disabled={narrativeLoading}
              className={cn(
                "flex items-center gap-1.5 bg-brand text-white text-xs font-semibold px-3 py-2 hover:bg-brand/90 transition-colors flex-shrink-0",
                narrativeLoading && "opacity-60 cursor-not-allowed"
              )}
            >
              {narrativeLoading
                ? <><RefreshCw size={12} className="animate-spin" /> Generating…</>
                : <><Sparkles size={12} /> Generate Narrative</>}
            </button>
          </div>
        </div>

        {/* Campaign Narrative Panel */}
        {narrativeOpen && (
          <div className="bg-surface-low border border-border rounded-lg p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-brand" />
                <h2 className="text-sm font-semibold text-on-surface">Campaign Performance Narrative</h2>
              </div>
              <button
                onClick={() => setNarrativeOpen(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-[60px]">
              {!narrative && narrativeLoading && (
                <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <RefreshCw size={12} className="animate-spin" />
                  Analyzing campaigns…
                </div>
              )}
              {narrative && (
                <div className="space-y-3">
                  {narrative.split("\n\n").filter(Boolean).map((para, i) => (
                    <p key={i} className="text-xs text-on-surface leading-relaxed">{para}</p>
                  ))}
                  {narrativeLoading && <span className="inline-block w-1.5 h-3 bg-brand animate-pulse" />}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
