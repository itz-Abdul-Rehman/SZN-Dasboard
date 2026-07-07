"use client";

import React, { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GoalProgressBar from "@/components/dashboard/GoalProgressBar";
import {
  DollarSign, CreditCard, Phone, TrendingUp, Megaphone,
  PhoneCall, Trophy, Sparkles, Zap, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { cn } from "@/lib/utils";
import type { MasterKpis, CloserLeaderboardRow, ClientGoalProgress } from "@/lib/db/types";

function fmtMoney(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function renderMarkdown(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ElementType;
  sparkline?: { day: string; value: number }[];
  trend?: "up" | "down" | "flat";
}

function MasterKpiCard({ label, value, sub, badge, badgeColor, icon: Icon, sparkline, trend }: KpiCardProps) {
  return (
    <div className="bg-surface-low border border-border rounded-lg p-4 flex flex-col gap-2 min-h-[140px]">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">{label}</span>
        <div className="flex items-center gap-1.5">
          {trend && (
            <span
              title="vs yesterday"
              className={cn(
                "text-xs font-bold leading-none",
                trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-on-surface-variant"
              )}
            >
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            </span>
          )}
          <Icon size={14} className="text-on-surface-variant flex-shrink-0" />
        </div>
      </div>
      <p className="text-3xl font-bold text-on-surface leading-none">{value}</p>
      {badge && (
        <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit", badgeColor)}>
          {badge}
        </span>
      )}
      {sub && <p className="text-xs text-on-surface-variant">{sub}</p>}
      {sparkline && sparkline.length > 0 && (
        <div className="mt-auto">
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={sparkline} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c8aa7a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c8aa7a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="#c8aa7a" strokeWidth={1.5} fill={`url(#grad-${label})`} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function MasterDashboard() {
  const [kpis, setKpis] = useState<MasterKpis | null>(null);
  const [leaderboard, setLeaderboard] = useState<CloserLeaderboardRow[]>([]);
  const [clientGoals, setClientGoals] = useState<ClientGoalProgress[]>([]);
  const [revenueChart, setRevenueChart] = useState<{ day: string; value: number }[]>([]);
  const [outcomeData, setOutcomeData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [trends, setTrends] = useState<{ revenue: "up" | "down" | "flat"; deals: "up" | "down" | "flat"; calls: "up" | "down" | "flat"; cash: "up" | "down" | "flat" } | null>(null);
  const [loading, setLoading] = useState(true);

  const [insights, setInsights] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [nextActions, setNextActions] = useState("");
  const [nextActionsLoading, setNextActionsLoading] = useState(false);
  const insightsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setKpis(d.kpis);
        setLeaderboard(d.leaderboard);
        setClientGoals(d.clientGoals);
        setRevenueChart(d.revenueChart);
        setOutcomeData(d.outcomeData ?? []);
        setTrends(d.trends ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  const topPerformer = leaderboard[0] ?? null;

  async function streamAI(mode: "insights" | "next-action", setter: React.Dispatch<React.SetStateAction<string>>, setLoad: (v: boolean) => void) {
    setter("");
    setLoad(true);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok || !res.body) throw new Error("Stream failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) setter((prev) => prev + decoder.decode(value));
      }
    } catch {
      setter("AI unavailable — please try again.");
    } finally {
      setLoad(false);
    }
  }

  // Build row 1 & row 2 matching the required screenshot layout
  const row1 = kpis ? [
    {
      label: "Total Revenue",
      value: fmtMoney(kpis.total_revenue),
      icon: DollarSign,
      sparkline: revenueChart,
      trend: trends?.revenue,
    },
    {
      label: "Total Deals Won",
      value: String(kpis.deals_won),
      icon: TrendingUp,
      sparkline: revenueChart,
      trend: trends?.deals,
    },
    {
      label: "Booked Calls",
      value: String(kpis.booked_calls),
      icon: PhoneCall,
    },
    {
      label: "Pacing",
      value: fmtMoney(kpis.pacing),
      sub: "Projected monthly revenue",
      icon: TrendingUp,
    },
  ] : [];

  const row2 = kpis ? [
    {
      label: "Total Cash Collected",
      value: fmtMoney(kpis.cash_collected),
      icon: CreditCard,
      sparkline: revenueChart,
      trend: trends?.cash,
    },
    {
      label: "Ad Spend",
      value: fmtMoney(kpis.ad_spend),
      icon: Megaphone,
    },
    {
      label: "Calls Taken",
      value: String(kpis.calls_taken),
      sub: `${kpis.no_shows} no-shows`,
      icon: Phone,
      trend: trends?.calls,
    },
    {
      label: "ROAS",
      value: `${kpis.roas.toFixed(2)}x`,
      icon: TrendingUp,
    },
  ] : [];

  const Skeleton = () => (
    <div className="bg-surface-low border border-border rounded-lg p-4 h-[140px] animate-pulse" />
  );

  return (
    <DashboardLayout title="Dashboard > Master">
      <div className="space-y-6 animate-fade-in">

        {/* Row 1 — Revenue, Deals Won, Booked Calls, Pacing */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
            : row1.map((kpi) => <MasterKpiCard key={kpi.label} {...kpi} />)}
        </div>

        {/* Row 2 — Cash, Ad Spend, Calls Taken, ROAS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
            : row2.map((kpi) => <MasterKpiCard key={kpi.label} {...kpi} />)}
        </div>

        {/* Monthly Goal Progress */}
        <div className="bg-surface-low border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-on-surface mb-4">Monthly Goal Progress</h2>
          {loading ? (
            <div className="h-24 animate-pulse bg-surface-high rounded" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {clientGoals.map((client) => {
                const revPct = client.rev_goal > 0 ? (client.rev_current / client.rev_goal) * 100 : 0;
                const callsPct = client.calls_goal > 0 ? (client.calls_current / client.calls_goal) * 100 : 0;
                const revStatus = revPct >= 80 ? "on-pace" : revPct >= 50 ? "stable" : "at-risk";
                const callsStatus = callsPct >= 80 ? "on-pace" : callsPct >= 50 ? "stable" : "behind";
                return (
                  <div key={client.client_id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-on-surface">{client.name}</span>
                      <span className="text-xs text-on-surface-variant">{revPct.toFixed(0)}% Monthly</span>
                    </div>
                    <GoalProgressBar
                      percentage={revPct}
                      current={`Rev: ${fmtMoney(client.rev_current)}`}
                      goal={fmtMoney(client.rev_goal)}
                      label="Rev"
                      status={revStatus as "on-pace" | "stable" | "at-risk"}
                    />
                    <GoalProgressBar
                      percentage={callsPct}
                      current={`Calls: ${client.calls_current} / ${client.calls_goal}`}
                      goal={String(client.calls_goal)}
                      label="Calls"
                      status={callsStatus as "on-pace" | "stable" | "behind"}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leaderboard + Top Performer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-low border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-on-surface">Top Performers Leaderboard</h2>
              <Trophy size={14} className="text-warning" />
            </div>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 animate-pulse bg-surface-high rounded" />)}</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] text-on-surface-variant uppercase tracking-wider border-b border-border">
                    <th className="text-left pb-2 pr-3 font-medium">Rank</th>
                    <th className="text-left pb-2 font-medium">Name</th>
                    <th className="text-right pb-2 font-medium">Revenue</th>
                    <th className="text-right pb-2 font-medium">Calls</th>
                    <th className="text-right pb-2 font-medium hidden sm:table-cell">Close %</th>
                    <th className="text-right pb-2 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaderboard.length === 0 && (
                    <tr><td colSpan={6} className="py-4 text-center text-xs text-on-surface-variant">No closer activity this month yet.</td></tr>
                  )}
                  {leaderboard.map((row, i) => (
                    <tr key={row.closer_id} className="group">
                      <td className="py-2.5 pr-3 text-xs font-mono text-on-surface-variant">{String(i + 1).padStart(2, "0")}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-surface-high flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-bold text-on-surface-variant">
                              {row.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </span>
                          </div>
                          <span className="text-sm text-on-surface">{row.full_name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-sm font-mono text-on-surface">{fmtMoney(row.revenue)}</td>
                      <td className="py-2.5 text-right text-sm text-on-surface-variant">{row.calls}</td>
                      <td className="py-2.5 text-right text-sm text-on-surface-variant hidden sm:table-cell">{row.close_rate.toFixed(1)}%</td>
                      <td className="py-2.5 text-right text-sm">
                        {row.trend_up === true && <span className="text-success">↗</span>}
                        {row.trend_up === false && <span className="text-danger">↘</span>}
                        {row.trend_up === null && <span className="text-on-surface-variant">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-surface-low border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-on-surface mb-4">Top Performer This Month</h2>
            {loading ? (
              <div className="h-24 animate-pulse bg-surface-high rounded" />
            ) : topPerformer ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-surface-high border border-border flex items-center justify-center">
                    <span className="text-base font-bold text-on-surface">
                      {topPerformer.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-on-surface">{topPerformer.full_name}</p>
                    <p className="text-xs text-on-surface-variant">Top Closer · {topPerformer.close_rate.toFixed(1)}% close rate</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-surface border border-border rounded p-3 text-center">
                    <p className="text-lg font-bold text-success">{fmtMoney(topPerformer.revenue)}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">Revenue</p>
                  </div>
                  <div className="bg-surface border border-border rounded p-3 text-center">
                    <p className="text-lg font-bold text-on-surface">{topPerformer.calls}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">Calls</p>
                  </div>
                  <div className="bg-surface border border-border rounded p-3 text-center">
                    <p className="text-lg font-bold text-on-surface">{topPerformer.close_rate.toFixed(0)}%</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">Close %</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">No closer activity logged this month yet.</p>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-low border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-on-surface">Revenue Trend</h2>
              <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <span className="w-2 h-2 bg-success inline-block" />
                7 Days
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueChart.length ? revenueChart : [{ day: "—", value: 0 }]}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#8e9192", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8e9192", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#1c1b1b", border: "1px solid #2a2a2a", borderRadius: 0, fontSize: 12 }}
                  labelStyle={{ color: "#e5e2e1" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`$${(v / 1000).toFixed(1)}k`, "Revenue"]}
                />
                <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-surface-low border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-on-surface mb-4">Call Outcomes Distribution</h2>
            {loading ? (
              <div className="h-[180px] animate-pulse bg-surface-high rounded" />
            ) : (() => {
              const total = outcomeData.reduce((s, d) => s + d.value, 0);
              return (
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="relative">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" strokeWidth={0}>
                          {outcomeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-on-surface">{total.toLocaleString()}</span>
                      <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Total</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    {outcomeData.map((item) => (
                      <div key={item.name} className="flex items-start gap-2">
                        <div className="w-2 h-2 mt-1 flex-shrink-0" style={{ background: item.color }} />
                        <div>
                          <p className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">{item.name}</p>
                          <p className="text-sm font-bold text-on-surface">
                            {total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%
                            <span className="text-xs font-normal text-on-surface-variant ml-1">({item.value})</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* AI Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-surface-low border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={14} className="text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">AI Insights</p>
                  <p className="text-xs text-on-surface-variant">Performance analysis from your live KPIs.</p>
                </div>
              </div>
              <button
                onClick={() => streamAI("insights", setInsights, setInsightsLoading)}
                disabled={insightsLoading}
                className={cn(
                  "flex items-center gap-1.5 bg-brand text-white text-xs font-semibold px-3 py-2 hover:bg-brand/90 transition-colors flex-shrink-0",
                  insightsLoading && "opacity-60 cursor-not-allowed"
                )}
              >
                {insightsLoading
                  ? <><RefreshCw size={12} className="animate-spin" /> Analyzing…</>
                  : <><Sparkles size={12} /> Generate Insights</>}
              </button>
            </div>
            <div ref={insightsRef} className="min-h-[80px]">
              {!insights && !insightsLoading && (
                <p className="text-xs text-on-surface-variant italic">Click &quot;Generate Insights&quot; to analyze your current KPIs with AI.</p>
              )}
              {(insights || insightsLoading) && (
                <div className="space-y-1.5">
                  {insights.split("\n").filter(Boolean).map((line, i) => (
                    <p key={i} className="text-xs text-on-surface leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(line) }} />
                  ))}
                  {insightsLoading && <span className="inline-block w-1.5 h-3 bg-brand animate-pulse" />}
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-low border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-warning/10 border border-warning/20 flex items-center justify-center flex-shrink-0">
                  <Zap size={14} className="text-warning" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">Next Best Actions</p>
                  <p className="text-xs text-on-surface-variant">AI-recommended moves for this week.</p>
                </div>
              </div>
              <button
                onClick={() => streamAI("next-action", setNextActions, setNextActionsLoading)}
                disabled={nextActionsLoading}
                className={cn(
                  "flex items-center gap-1.5 bg-surface-high border border-border text-on-surface text-xs font-semibold px-3 py-2 hover:bg-surface-highest transition-colors flex-shrink-0",
                  nextActionsLoading && "opacity-60 cursor-not-allowed"
                )}
              >
                {nextActionsLoading
                  ? <><RefreshCw size={12} className="animate-spin" /> Thinking…</>
                  : <><Zap size={12} /> Get Actions</>}
              </button>
            </div>
            <div className="min-h-[80px]">
              {!nextActions && !nextActionsLoading && (
                <p className="text-xs text-on-surface-variant italic">Click &quot;Get Actions&quot; to get AI-recommended next steps based on your data.</p>
              )}
              {(nextActions || nextActionsLoading) && (
                <div className="space-y-1.5">
                  {nextActions.split("\n").filter(Boolean).map((line, i) => (
                    <p key={i} className="text-xs text-on-surface leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(line) }} />
                  ))}
                  {nextActionsLoading && <span className="inline-block w-1.5 h-3 bg-warning animate-pulse" />}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
