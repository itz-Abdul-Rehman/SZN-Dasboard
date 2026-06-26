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

const staticReports = [
  { id: 1, type: "monthly" as ReportType, title: "June 2026 — Monthly Performance Report",   generated: "Jun 1, 2026 09:00 AM",  size: "2.4 MB", dateFrom: "2026-06-01", dateTo: "2026-06-30" },
  { id: 2, type: "weekly" as ReportType,  title: "Week 25 — Weekly Performance Report",       generated: "Jun 22, 2026 08:00 AM", size: "1.1 MB", dateFrom: "2026-06-15", dateTo: "2026-06-21" },
  { id: 3, type: "daily" as ReportType,   title: "Jun 24, 2026 — Daily Performance Report",   generated: "Jun 24, 2026 11:59 PM", size: "0.8 MB", dateFrom: "2026-06-24", dateTo: "2026-06-24" },
  { id: 4, type: "daily" as ReportType,   title: "Jun 23, 2026 — Daily Performance Report",   generated: "Jun 23, 2026 11:59 PM", size: "0.7 MB", dateFrom: "2026-06-23", dateTo: "2026-06-23" },
  { id: 5, type: "weekly" as ReportType,  title: "Week 24 — Weekly Performance Report",       generated: "Jun 15, 2026 08:00 AM", size: "1.2 MB", dateFrom: "2026-06-08", dateTo: "2026-06-14" },
  { id: 6, type: "monthly" as ReportType, title: "May 2026 — Monthly Performance Report",     generated: "May 1, 2026 09:00 AM",  size: "2.6 MB", dateFrom: "2026-05-01", dateTo: "2026-05-31" },
];

const typeConfig: Record<ReportType, { label: string; className: string }> = {
  daily:   { label: "Daily",   className: "bg-brand/10 text-brand border-brand/20" },
  weekly:  { label: "Weekly",  className: "bg-secondary/10 text-secondary border-secondary/20" },
  monthly: { label: "Monthly", className: "bg-warning/10 text-warning border-warning/20" },
};

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export default function ReportsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [error, setError] = useState("");

  const filtered = staticReports.filter((r) => typeFilter === "all" || r.type === typeFilter);

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
    <DashboardLayout title="Dashboard > Reports" userName="Admin User" role="Admin">
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

        {/* Schedule Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Clock,    label: "Daily Reports",   desc: "Generated every midnight automatically" },
            { icon: Calendar, label: "Weekly Reports",  desc: "Every Monday at 8:00 AM" },
            { icon: FileText, label: "Monthly Reports", desc: "1st of each month at 9:00 AM" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-surface-low border border-border rounded-lg p-4 flex items-center gap-3">
              <Icon size={16} className="text-on-surface-variant flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-on-surface">{label}</p>
                <p className="text-[11px] text-on-surface-variant">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 bg-surface-low border border-border rounded-lg p-1 w-fit">
          {(["all", "daily", "weekly", "monthly"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                typeFilter === f ? "bg-surface-high text-on-surface" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              {f === "all" ? "All Reports" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Report List */}
        <div className="bg-surface-low border border-border rounded-lg overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-container transition-colors group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-9 h-9 bg-surface-high flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-on-surface-variant" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{r.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 border", typeConfig[r.type].className)}>
                        {typeConfig[r.type].label}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">{r.generated}</span>
                      <span className="text-[11px] text-on-surface-variant hidden sm:inline">{r.size}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleGenerate(r.id, { dateFrom: r.dateFrom, dateTo: r.dateTo, reportTitle: r.title, autoDownload: true })}
                  disabled={generatingId !== null}
                  title={`Download data for ${r.title}`}
                  className={cn(
                    "flex items-center gap-1.5 text-xs text-on-surface-variant border border-border px-3 py-1.5 hover:bg-surface-high hover:text-on-surface transition-colors flex-shrink-0 ml-4 opacity-0 group-hover:opacity-100",
                    generatingId !== null && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <Download size={12} /> {generatingId === r.id ? "Generating…" : "Download"}
                </button>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border">
            <p className="text-xs text-on-surface-variant">{filtered.length} reports</p>
          </div>
        </div>

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
