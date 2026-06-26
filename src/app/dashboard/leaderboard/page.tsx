"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import type { CloserLeaderboardRow } from "@/lib/db/types";

type SetterRow = { setter_id: string; full_name: string; calls_booked: number; conv_rate: number };

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"closers" | "setters">("closers");
  const [closers, setClosers] = useState<CloserLeaderboardRow[]>([]);
  const [setters, setSetters] = useState<SetterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => { setClosers(d.closers ?? []); setSetters(d.setters ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const top3 = closers.slice(0, 3);
  const weeklyRevData = closers.slice(0, 5).map((c) => ({
    name: initials(c.full_name),
    revenue: Math.round(c.revenue / 1000),
  }));

  return (
    <DashboardLayout title="Dashboard > Leaderboard">
      <div className="space-y-6 animate-fade-in">

        {/* Podium — top 3 */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse bg-surface-low border border-border rounded-lg" />)}
          </div>
        ) : top3.length >= 2 ? (
          <div className="grid grid-cols-3 gap-3">
            {/* 2nd place */}
            <div className="bg-surface-low border border-border rounded-lg p-5 text-center flex flex-col items-center gap-2 mt-6">
              <div className="w-10 h-10 bg-surface-high border-2 border-outline flex items-center justify-center">
                <span className="text-sm font-bold text-on-surface-variant">{initials(top3[1]?.full_name ?? "")}</span>
              </div>
              <div className="text-2xl font-bold text-on-surface-variant">2</div>
              <p className="text-xs font-medium text-on-surface">{top3[1]?.full_name}</p>
              <p className="text-sm font-bold text-on-surface font-mono">${((top3[1]?.revenue ?? 0) / 1000).toFixed(1)}k</p>
            </div>
            {/* 1st place */}
            <div className="bg-surface-low border border-warning/30 p-5 text-center flex flex-col items-center gap-2 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Trophy size={20} className="text-warning" />
              </div>
              <div className="w-12 h-12 bg-warning/10 border-2 border-warning flex items-center justify-center mt-2">
                <span className="text-base font-bold text-warning">{initials(top3[0]?.full_name ?? "")}</span>
              </div>
              <div className="text-3xl font-bold text-warning">1</div>
              <p className="text-xs font-semibold text-on-surface">{top3[0]?.full_name}</p>
              <p className="text-base font-bold text-on-surface font-mono">${((top3[0]?.revenue ?? 0) / 1000).toFixed(1)}k</p>
            </div>
            {/* 3rd place */}
            <div className="bg-surface-low border border-border rounded-lg p-5 text-center flex flex-col items-center gap-2 mt-8">
              <div className="w-9 h-9 bg-surface-high border-2 border-border flex items-center justify-center">
                <span className="text-sm font-bold text-on-surface-variant">{initials(top3[2]?.full_name ?? "—")}</span>
              </div>
              <div className="text-xl font-bold text-on-surface-variant">3</div>
              <p className="text-xs font-medium text-on-surface">{top3[2]?.full_name ?? "—"}</p>
              <p className="text-sm font-bold text-on-surface font-mono">${((top3[2]?.revenue ?? 0) / 1000).toFixed(1)}k</p>
            </div>
          </div>
        ) : (
          <div className="bg-surface-low border border-border rounded-lg p-8 text-center">
            <p className="text-sm text-on-surface-variant">No leaderboard data yet. Calls need to be logged with a closer assigned.</p>
          </div>
        )}

        {/* Tab toggle */}
        <div className="flex items-center gap-1 bg-surface-low border border-border rounded-lg p-1 w-fit">
          {(["closers", "setters"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium capitalize transition-colors",
                tab === t ? "bg-surface-high text-on-surface" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Full table */}
        <div className="bg-surface-low border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="space-y-px p-4">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse bg-surface-high rounded mb-2" />)}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-on-surface-variant uppercase tracking-wider border-b border-border">
                  <th className="text-left px-5 py-3 font-medium">Rank</th>
                  <th className="text-left px-3 py-3 font-medium">Name</th>
                  {tab === "closers" ? (
                    <>
                      <th className="text-right px-3 py-3 font-medium">Revenue</th>
                      <th className="text-right px-3 py-3 font-medium hidden md:table-cell">Calls</th>
                      <th className="text-right px-3 py-3 font-medium">Close Rate</th>
                    </>
                  ) : (
                    <>
                      <th className="text-right px-3 py-3 font-medium">Calls Booked</th>
                      <th className="text-right px-3 py-3 font-medium">Conv Rate</th>
                    </>
                  )}
                  <th className="text-right px-5 py-3 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tab === "closers" && closers.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-on-surface-variant">No closer data yet.</td></tr>
                )}
                {tab === "setters" && setters.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-on-surface-variant">No setter data yet.</td></tr>
                )}
                {tab === "closers" && closers.map((row, i) => (
                  <tr key={row.closer_id} className="hover:bg-surface-container transition-colors">
                    <td className="px-5 py-3">
                      <span className={cn("text-sm font-bold font-mono", i === 0 ? "text-warning" : i === 1 ? "text-on-surface" : "text-on-surface-variant")}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("w-7 h-7 flex items-center justify-center flex-shrink-0", i === 0 ? "bg-warning/10 border border-warning/30" : "bg-surface-high")}>
                          <span className={cn("text-[10px] font-bold", i === 0 ? "text-warning" : "text-on-surface-variant")}>{initials(row.full_name)}</span>
                        </div>
                        <span className="text-sm text-on-surface">{row.full_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-mono font-semibold text-on-surface">${(row.revenue / 1000).toFixed(1)}k</td>
                    <td className="px-3 py-3 text-right text-sm text-on-surface-variant hidden md:table-cell">{row.calls}</td>
                    <td className="px-3 py-3 text-right text-sm text-on-surface-variant">{row.close_rate.toFixed(1)}%</td>
                    <td className="px-5 py-3 text-right">
                      {row.trend_up === true  && <TrendingUp   size={16} className="text-success inline" />}
                      {row.trend_up === false && <TrendingDown  size={16} className="text-danger inline" />}
                      {row.trend_up === null  && <Minus         size={16} className="text-on-surface-variant inline" />}
                    </td>
                  </tr>
                ))}
                {tab === "setters" && setters.map((row, i) => (
                  <tr key={row.setter_id} className="hover:bg-surface-container transition-colors">
                    <td className="px-5 py-3">
                      <span className={cn("text-sm font-bold font-mono", i === 0 ? "text-warning" : "text-on-surface-variant")}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-surface-high flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-on-surface-variant">{initials(row.full_name)}</span>
                        </div>
                        <span className="text-sm text-on-surface">{row.full_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-semibold text-on-surface">{row.calls_booked}</td>
                    <td className="px-3 py-3 text-right text-sm text-on-surface-variant">{row.conv_rate.toFixed(2)}%</td>
                    <td className="px-5 py-3 text-right">
                      <Minus size={16} className="text-on-surface-variant inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Revenue bar chart */}
        {tab === "closers" && !loading && closers.length > 0 && (
          <div className="bg-surface-low border border-border rounded-lg p-5">
            <h2 className="text-sm font-semibold text-on-surface mb-4">Revenue by Closer (All Time)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyRevData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#8e9192", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}k`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#e5e2e1", fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip contentStyle={{ background: "#1c1b1b", border: "1px solid #2a2a2a", borderRadius: 0, fontSize: 12 }} formatter={(v: any) => [`$${v}k`]} />
                <Bar dataKey="revenue" fill="#10B981" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
