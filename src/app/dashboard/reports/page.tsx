"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileText, Download, RefreshCw, Sparkles, Calendar, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ReportType = "daily" | "weekly" | "monthly";

interface GeneratedReport {
  title: string;
  generatedAt: string;
  kpis: {
    total_revenue: number; cash_collected: number; calls_booked: number;
    close_rate: number; avg_deal_size: number; no_shows: number; roas: number; ad_spend: number;
  };
  clientGoals: { name: string; rev_current: number; rev_goal: number; calls_current: number; calls_goal: number }[];
  outcomes: { name: string; value: number; color: string }[];
  narrative: string;
}

// Report cadence ids used to track which "Generate" button is busy.
const JOB = { daily: 1, weekly: 2, monthly: 3 } as const;

// Computes the real date range + title for a given cadence, based on today.
function rangeFor(type: ReportType): { dateFrom: string; dateTo: string; title: string } {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (type === "weekly") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { dateFrom: iso(from), dateTo: iso(today), title: `Weekly Report — ${iso(from)} to ${iso(today)}` };
  }
  if (type === "monthly") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      dateFrom: iso(from),
      dateTo: iso(today),
      title: `Monthly Report — ${today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
    };
  }
  return {
    dateFrom: iso(today),
    dateTo: iso(today),
    title: `Daily Report — ${today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
  };
}

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export default function ReportsPage() {
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async (
    jobId: number,
    opts?: { dateFrom?: string; dateTo?: string; reportTitle?: string; autoDownload?: boolean }
  ) => {
    setGeneratingId(jobId);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts ?? {}),
      });
      const data = await res.json();
      if (data.ok) {
        setReport(data.report);
        if (opts?.autoDownload) {
          const html = buildReportHTML(data.report);
          const win = window.open("", "_blank");
          if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
        }
      } else {
        setError(data.error ?? "Generation failed");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const html = buildReportHTML(report);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <DashboardLayout title="Dashboard > Reports">
      <div className="space-y-5 animate-fade-in">

        {/* Generate Now */}
        <div className="bg-surface-low border border-border rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-brand" />
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">AI-Powered Reports</p>
              <p className="text-xs text-on-surface-variant">Generates a full performance report with AI narrative from live Supabase data.</p>
            </div>
          </div>
          <button
            onClick={() => handleGenerate(0)}
            disabled={generatingId !== null}
            className={cn(
              "flex items-center gap-2 bg-primary text-on-primary text-xs font-semibold px-5 py-2.5 transition-all hover:bg-primary/90 flex-shrink-0",
              generatingId !== null && "opacity-60 cursor-not-allowed"
            )}
          >
            <RefreshCw size={13} className={generatingId === 0 ? "animate-spin" : ""} />
            {generatingId === 0 ? "Generating…" : "Generate Now"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg px-4 py-3 text-xs text-danger">
            {error}
          </div>
        )}

        {/* Generated Report Preview */}
        {report && (
          <div className="bg-surface-low border border-border rounded-lg p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-on-surface">{report.title}</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Generated {new Date(report.generatedAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 bg-surface-high border border-border text-on-surface text-xs font-semibold px-3 py-2 hover:bg-surface-highest transition-colors"
                >
                  <Download size={13} /> Download PDF
                </button>
                <button onClick={() => setReport(null)} className="text-on-surface-variant hover:text-on-surface transition-colors p-1">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Revenue",    value: fmt(report.kpis.total_revenue) },
                { label: "Close Rate", value: `${report.kpis.close_rate.toFixed(1)}%` },
                { label: "Calls",      value: String(report.kpis.calls_booked) },
                { label: "ROAS",       value: `${report.kpis.roas.toFixed(2)}x` },
              ].map((k) => (
                <div key={k.label} className="bg-surface border border-border p-3">
                  <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">{k.label}</p>
                  <p className="text-lg font-bold text-on-surface font-mono mt-0.5">{k.value}</p>
                </div>
              ))}
            </div>

            {/* AI Narrative */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={13} className="text-brand" />
                <span className="text-xs font-semibold text-on-surface">AI Narrative</span>
              </div>
              {report.narrative.split("\n").filter(Boolean).map((line, i) => (
                <p key={i} className={cn(
                  "text-xs leading-relaxed break-words",
                  /^\d+\./.test(line) || line.toUpperCase() === line.trim()
                    ? "font-semibold text-on-surface mt-3"
                    : "text-on-surface-variant"
                )}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Generate a report for a specific period — all live from real data */}
        <div>
          <h2 className="text-sm font-semibold text-on-surface mb-1">Generate a report</h2>
          <p className="text-xs text-on-surface-variant mb-3">Each report is built live from your real Supabase data for the selected period.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { type: "daily" as ReportType,   icon: Clock,    label: "Daily",   desc: "Today" },
              { type: "weekly" as ReportType,  icon: Calendar, label: "Weekly",  desc: "Last 7 days" },
              { type: "monthly" as ReportType, icon: FileText, label: "Monthly", desc: "This month to date" },
            ]).map(({ type, icon: Icon, label, desc }) => {
              const jobId = JOB[type];
              const busy = generatingId === jobId;
              const r = rangeFor(type);
              return (
                <button
                  key={type}
                  onClick={() => handleGenerate(jobId, { dateFrom: r.dateFrom, dateTo: r.dateTo, reportTitle: r.title })}
                  disabled={generatingId !== null}
                  className={cn(
                    "bg-surface-low border border-border rounded-lg p-4 flex items-center gap-3 text-left transition-colors hover:bg-surface-container",
                    generatingId !== null && !busy && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {busy
                    ? <RefreshCw size={16} className="text-brand flex-shrink-0 animate-spin" />
                    : <Icon size={16} className="text-on-surface-variant flex-shrink-0" />}
                  <div>
                    <p className="text-xs font-semibold text-on-surface">{label}</p>
                    <p className="text-[11px] text-on-surface-variant">{busy ? "Generating…" : desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Empty state — report history isn't persisted yet, so nothing to list */}
        {!report && (
          <div className="bg-surface-low border border-border rounded-lg px-5 py-10 text-center">
            <FileText size={20} className="text-on-surface-variant mx-auto mb-2 opacity-60" />
            <p className="text-sm font-medium text-on-surface">No report generated yet</p>
            <p className="text-xs text-on-surface-variant mt-1">Pick a period above (or &ldquo;Generate Now&rdquo;) to build a live report from your real data.</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

function buildReportHTML(report: GeneratedReport): string {
  const kpiRows = [
    ["Total Revenue", `$${report.kpis.total_revenue.toLocaleString()}`],
    ["Cash Collected", `$${report.kpis.cash_collected.toLocaleString()}`],
    ["Calls Booked", String(report.kpis.calls_booked)],
    ["Close Rate", `${report.kpis.close_rate.toFixed(1)}%`],
    ["Avg Deal Size", `$${report.kpis.avg_deal_size.toLocaleString()}`],
    ["No-Shows", String(report.kpis.no_shows)],
    ["ROAS", `${report.kpis.roas.toFixed(2)}x`],
    ["Ad Spend", `$${report.kpis.ad_spend.toLocaleString()}`],
  ];

  const narrativeHTML = report.narrative
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      if (line.toUpperCase() === line.trim() || /^\d+\./.test(line)) {
        return `<h3 style="margin:16px 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#666;">${line}</h3>`;
      }
      return `<p style="margin:4px 0;font-size:12px;color:#333;line-height:1.6;">${line}</p>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><title>${report.title}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#111;}
  h1{font-size:20px;font-weight:700;margin:0 0 4px;}
  .meta{font-size:11px;color:#888;margin-bottom:24px;}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
  .kpi{border:1px solid #e5e5e5;padding:12px;}
  .kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;}
  .kpi-value{font-size:18px;font-weight:700;margin-top:4px;}
  .section{border-top:1px solid #e5e5e5;padding-top:16px;margin-top:16px;}
  @media print{body{margin:0;}}
</style></head><body>
  <h1>${report.title}</h1>
  <div class="meta">Generated ${new Date(report.generatedAt).toLocaleString()} · SZN Marketing Agency Dashboard</div>
  <div class="kpi-grid">
    ${kpiRows.slice(0, 4).map(([l, v]) => `<div class="kpi"><div class="kpi-label">${l}</div><div class="kpi-value">${v}</div></div>`).join("")}
  </div>
  <div class="kpi-grid">
    ${kpiRows.slice(4).map(([l, v]) => `<div class="kpi"><div class="kpi-label">${l}</div><div class="kpi-value">${v}</div></div>`).join("")}
  </div>
  <div class="section">
    <h2 style="font-size:13px;font-weight:600;margin:0 0 12px;">AI Performance Narrative</h2>
    ${narrativeHTML}
  </div>
  <div class="section">
    <h2 style="font-size:13px;font-weight:600;margin:0 0 12px;">Client Goal Progress</h2>
    ${report.clientGoals.map((g) => {
      const pct = g.rev_goal > 0 ? ((g.rev_current / g.rev_goal) * 100).toFixed(0) : "0";
      return `<p style="font-size:12px;margin:4px 0;"><strong>${g.name}</strong> — Revenue $${g.rev_current.toLocaleString()} / $${g.rev_goal.toLocaleString()} (${pct}%) · Calls ${g.calls_current}/${g.calls_goal}</p>`;
    }).join("")}
  </div>
</body></html>`;
}
