"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  DollarSign, Phone, Users, TrendingUp,
  RefreshCw, Sparkles, Filter, Search, MoreVertical,
  CheckCircle, PauseCircle, Archive, X, Info
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import type { AdCampaign, AdsKpis } from "@/lib/db/types";

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtNum(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
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

interface MetaKpiCardProps {
  label: string;
  value: string;
  sub?: string;
  badge?: string;
  icon: React.ElementType;
  tooltip?: string;
  highlight?: "success" | "warning" | "danger";
}

function MetaKpiCard({ label, value, sub, badge, icon: Icon, tooltip, highlight }: MetaKpiCardProps) {
  const valueColor = highlight === "success" ? "text-success" : highlight === "warning" ? "text-warning" : highlight === "danger" ? "text-danger" : "text-on-surface";
  return (
    <div className="bg-surface-low border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">{label}</span>
          {tooltip && (
            <span title={tooltip}>
              <Info size={11} className="text-on-surface-variant opacity-60" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 bg-secondary/20 text-secondary border border-secondary/30 uppercase">{badge}</span>
          )}
          <Icon size={13} className="text-on-surface-variant" />
        </div>
      </div>
      <p className={cn("text-2xl font-bold font-mono", valueColor)}>{value}</p>
      {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
    </div>
  );
}

const emptyKpis: AdsKpis = {
  total_spend: 0, total_impressions: 0, total_results: 0, total_followers: 0,
  avg_ctr: 0, cpm: 0, cpc: 0,
  roas_rev: 0, roas_cash: 0,
  cost_per_call: 0, cost_per_customer: 0, cost_per_convo: 0,
  cost_per_follower: 0, cost_per_result: 0,
};

export default function AdsDashboard() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [kpis, setKpis] = useState<AdsKpis>(emptyKpis);
  const [spendChart, setSpendChart] = useState<{ metric_date: string; ad_spend: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState("Never synced");
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
        const cs: AdCampaign[] = d.campaigns ?? [];
        setCampaigns(cs);
        setKpis(d.kpis ?? emptyKpis);
        setSpendChart(d.spendChart ?? []);
        const latest = cs
          .map((c) => c.last_synced_at)
          .filter((t): t is string => Boolean(t))
          .sort()
          .pop();
        if (latest) setLastSynced(new Date(latest).toLocaleString());
      })
      .finally(() => setLoading(false));
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

  const Skel = () => <div className="h-[88px] animate-pulse bg-surface-low border border-border rounded-lg" />;

  // Row 1: Total Spend, Total Followers, Cost/Follower, Cost/Convo
  const row1: MetaKpiCardProps[] = [
    { label: "Total Spend",     value: fmt(kpis.total_spend),                                                       icon: DollarSign },
    { label: "Total Followers", value: fmtNum(kpis.total_followers),                                                icon: Users,      tooltip: "Sum of followers gained across all ad accounts this month" },
    { label: "Cost/Follower",   value: kpis.total_followers > 0 ? fmt(kpis.cost_per_follower) : "—",               icon: Users,      badge: "AD LEVEL", tooltip: "Ad spend ÷ followers gained" },
    { label: "Cost/Convo",      value: kpis.cost_per_convo > 0 ? fmt(kpis.cost_per_convo) : "—",                   icon: Phone,      tooltip: "Ad spend ÷ new conversations (setter logs)" },
  ];

  // Row 2: ROAS Cash, ROAS Rev, Cost/Call, Cost/Customer
  const row2: MetaKpiCardProps[] = [
    { label: "ROAS Cash",       value: `${kpis.roas_cash.toFixed(2)}x`,  icon: TrendingUp, tooltip: "Cash collected ÷ ad spend",
      highlight: kpis.roas_cash >= 1 ? "success" : kpis.roas_cash >= 0.5 ? "warning" : "danger" },
    { label: "ROAS Rev",        value: `${kpis.roas_rev.toFixed(2)}x`,   icon: TrendingUp, tooltip: "Total revenue ÷ ad spend",
      highlight: kpis.roas_rev >= 1 ? "success" : kpis.roas_rev >= 0.5 ? "warning" : "danger" },
    { label: "Cost/Call",       value: kpis.cost_per_call > 0 ? fmt(kpis.cost_per_call) : "—",         icon: Phone, tooltip: "Ad spend ÷ calls taken (non-rescheduled)" },
    { label: "Cost/Customer",   value: kpis.cost_per_customer > 0 ? fmt(kpis.cost_per_customer) : "—", icon: Users, tooltip: "Ad spend ÷ closed deals" },
  ];

  return (
    <DashboardLayout title="Dashboard > Ads">
      <div className="space-y-6 animate-fade-in">

        {/* Row 1 Meta KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skel key={i} />) : row1.map((kpi) => <MetaKpiCard key={kpi.label} {...kpi} />)}
        </div>

        {/* Row 2 Meta KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skel key={i} />) : row2.map((kpi) => <MetaKpiCard key={kpi.label} {...kpi} />)}
        </div>

        {/* Secondary stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse bg-surface-low border border-border rounded-lg" />) : [
            { label: "Impressions",  value: fmtNum(kpis.total_impressions) },
            { label: "Results",      value: fmtNum(kpis.total_results) },
            { label: `CTR (impr-weighted)`,  value: `${kpis.avg_ctr.toFixed(2)}%` },
            { label: "CPM",          value: fmt(kpis.cpm) },
          ].map((s) => (
            <div key={s.label} className="bg-surface-low border border-border rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">{s.label}</span>
              <span className="text-sm font-bold font-mono text-on-surface">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Campaign Table */}
        <div className="bg-surface-low border border-border rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-on-surface">Campaign Performance</h2>
              <p className="text-xs text-on-surface-variant">Live data from Supabase. Archived campaigns excluded from KPI totals.</p>
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
                    <th className="text-right px-3 py-3 font-medium hidden xl:table-cell">Followers</th>
                    <th className="text-right px-3 py-3 font-medium">Cost/Res</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="px-5 py-8 text-center text-xs text-on-surface-variant">No campaigns match your filter.</td></tr>
                  )}
                  {filtered.map((c) => {
                    const derivedResults = c.results > 0 ? c.results : (c.cost_per_result > 0 ? Math.round(c.spend / c.cost_per_result) : 0);
                    return (
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
                        <td className="px-3 py-3 text-right text-sm text-on-surface">{derivedResults.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-sm text-on-surface-variant hidden lg:table-cell">{c.ctr.toFixed(2)}%</td>
                        <td className="px-3 py-3 text-right text-sm text-on-surface-variant hidden xl:table-cell">
                          {(c.followers ?? 0) > 0 ? fmtNum(c.followers) : "—"}
                        </td>
                        <td className={cn("px-3 py-3 text-right text-sm font-mono", c.flagged ? "text-danger" : "text-on-surface")}>
                          {derivedResults > 0 ? `$${(c.spend / derivedResults).toFixed(2)}` : "—"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button className="text-on-surface-variant hover:text-on-surface transition-colors opacity-0 group-hover:opacity-100">
                            <MoreVertical size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-surface-low border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-on-surface">Daily Ad Spend</h2>
              <p className="text-xs text-on-surface-variant">14-day velocity.</p>
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

        {/* Sync + AI */}
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

        {narrativeOpen && (
          <div className="bg-surface-low border border-border rounded-lg p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-brand" />
                <h2 className="text-sm font-semibold text-on-surface">Campaign Performance Narrative</h2>
              </div>
              <button onClick={() => setNarrativeOpen(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
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
