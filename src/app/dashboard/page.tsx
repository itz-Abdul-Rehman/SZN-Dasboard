"use client";

import React, { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import KpiCard from "@/components/dashboard/KpiCard";
import GoalProgressBar from "@/components/dashboard/GoalProgressBar";
import {
  DollarSign, CreditCard, Phone, Target, BarChart2, Calendar,
  TrendingUp, Megaphone, Percent, Activity, Trophy, Sparkles, Zap, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { cn } from "@/lib/utils";
import type { MasterKpis, CloserLeaderboardRow, ClientGoalProgress } from "@/lib/db/types";

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

const dealVelocityData = [
  { week: "W1", value: 12 }, { week: "W2", value: 18 }, { week: "W3", value: 24 }, { week: "W4", value: 38 },
];

function renderMarkdown(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export default function MasterDashboard() {
  const [kpis, setKpis] = useState<MasterKpis | null>(null);
  const [leaderboard, setLeaderboard] = useState<CloserLeaderboardRow[]>([]);
  const [clientGoals, setClientGoals] = useState<ClientGoalProgress[]>([]);
  const [revenueChart, setRevenueChart] = useState<{ day: string; value: number }[]>([]);
  const [outcomeData, setOutcomeData] = useState<{ name: string; value: number; color: string }[]>([]);
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
      })
      .finally(() => setLoading(false));
  }, []);

  const kpiCards = kpis
    ? [
        { label: "Total Revenue",  value: fmt(kpis.total_revenue),   trend: "12.5%", trendUp: true,  icon: DollarSign },
        { label: "Cash Collected", value: fmt(kpis.cash_collected),  trend: "8.2%",  trendUp: true,  icon: CreditCard },
        { label: "Calls Booked",   value: String(kpis.calls_booked), trend: "2.4%",  trendUp: false, icon: Phone },
        { label: "Close Rate",     value: `${kpis.close_rate.toFixed(1)}%`, trend: "1.5%", trendUp: true, icon: Target },
        { label: "Avg Deal Size",  value: fmt(kpis.avg_deal_size),   trend: "5.0%",  trendUp: true,  icon: BarChart2 },
        { label: "No-Shows",       value: String(kpis.no_shows),     trend: "4.1%",  trendUp: false, icon: Calendar },
        { label: "ROAS",           value: `${kpis.roas.toFixed(2)}x`, trend: "0.4x", trendUp: true,  icon: TrendingUp },
        { label: "Ad Spend",       value: fmt(kpis.ad_spend),        trend: "Steady", trendUp: null, icon: Megaphone },
        { label: "Conv Rate",      value: "3.2%",                    trend: "0.5%",  trendUp: true,  icon: Percent },
        { label: "Daily Trend",    value: "+22%",                    trend: "Velocity Spike", trendUp: true, icon: Activity },
      ]
    : [];

  const topPerformer = leaderboard[0] ?? null;

  async function streamAI(mode: "insights" | "next-action", setter: React.Dispatch<React.SetStateAction<string>>, setLoading: (v: boolean) => void) {
    setter("");
    setLoading(true);
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
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="Dashboard > Master" userName="Admin User" role="Master Account">
      <div className="space-y-6 animate-fade-in">

        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {loading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-surface-low border border-border rounded-lg p-4 h-[88px] animate-pulse" />
              ))
            : kpiCards.map((kpi) => (
                <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} trend={kpi.trend} trendUp={kpi.trendUp} icon={kpi.icon} />
              ))}
          <div className="bg-surface-low border border-border rounded-lg p-4 flex flex-col gap-2 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase">Top Performer</span>
              <Trophy size={14} className="text-warning" />
            </div>
            <p className="text-lg font-bold text-on-surface leading-tight truncate" title={topPerformer?.full_name ?? ""}>
              {loading ? "—" : (topPerformer?.full_name ?? "—")}
            </p>
            <p className="text-success text-xs font-medium">
              {loading ? "—" : fmt(topPerformer?.revenue ?? 0) + " MoD"}
            </p>
          </div>
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
                      current={`Rev: ${fmt(client.rev_current)}`}
                      goal={fmt(client.rev_goal)}
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

        {/* Leaderboard + Setter Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-low border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-on-surface">Top Performers Leaderboard</h2>
              <button className="text-xs text-brand hover:underline">View All</button>
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
                      <td className="py-2.5 text-right text-sm font-mono text-on-surface">{fmt(row.revenue)}</td>
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

          {/* Setter Activity placeholder — will be wired when setter table is populated */}
          <div className="bg-surface-low border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-on-surface mb-4">Setter Activity Summary</h2>
            <p className="text-xs text-on-surface-variant">Connect setters and their activity will appear here.</p>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-surface-low border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-on-surface">Revenue Trend</h2>
              <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <span className="w-2 h-2 bg-success inline-block" />
                Growth
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-on-surface">Deal Velocity</h2>
              <span className="text-xs text-on-surface-variant">Last 30 Days</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dealVelocityData}>
                <defs>
                  <linearGradient id="dealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#adc6ff" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#adc6ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "#8e9192", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8e9192", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1c1b1b", border: "1px solid #2a2a2a", borderRadius: 0, fontSize: 12 }} labelStyle={{ color: "#e5e2e1" }} />
                <Area type="monotone" dataKey="value" stroke="#adc6ff" strokeWidth={2} fill="url(#dealGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Call Outcomes Pie */}
        <div className="bg-surface-low border border-border rounded-lg p-5">
          <h2 className="text-sm font-semibold text-on-surface mb-4">Call Outcomes Distribution</h2>
          {loading ? (
            <div className="h-[200px] animate-pulse bg-surface-high rounded" />
          ) : (() => {
            const total = outcomeData.reduce((s, d) => s + d.value, 0);
            return (
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="relative">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={outcomeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" strokeWidth={0}>
                        {outcomeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-on-surface">{total.toLocaleString()}</span>
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Total</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  {outcomeData.map((item) => (
                    <div key={item.name} className="flex items-start gap-2">
                      <div className="w-2 h-2 mt-1 flex-shrink-0" style={{ background: item.color }} />
                      <div>
                        <p className="text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase">{item.name}</p>
                        <p className="text-sm font-bold text-on-surface">
                          {total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%
                          <span className="text-xs font-normal text-on-surface-variant ml-1">({item.value.toLocaleString()})</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* AI Row — Insights + Next Best Action */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Generate Insights */}
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
                    <p
                      key={i}
                      className="text-xs text-on-surface leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(line) }}
                    />
                  ))}
                  {insightsLoading && <span className="inline-block w-1.5 h-3 bg-brand animate-pulse" />}
                </div>
              )}
            </div>
          </div>

          {/* Next Best Action */}
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
                    <p
                      key={i}
                      className="text-xs text-on-surface leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(line) }}
                    />
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
