"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Download, ChevronDown, Pencil, Trash2, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Call } from "@/lib/db/types";

type CallRow = Call & { closer_name: string };

const outcomeBadge: Record<string, string> = {
  closed: "badge-closed", paid_in_full: "badge-closed", split_pay: "badge-closed",
  rescheduled: "badge-rescheduled",
  lost: "badge-lost", offer_declined: "badge-lost", not_a_fit: "badge-lost", deposit_only: "badge-lost",
  noshow: "badge-noshow", no_show: "badge-noshow", cancelled: "badge-noshow",
};
const outcomeLabel: Record<string, string> = {
  closed: "Closed", paid_in_full: "Paid in Full", split_pay: "Split Pay",
  rescheduled: "Rescheduled", lost: "Lost", offer_declined: "Offer Declined",
  not_a_fit: "Not a Fit", deposit_only: "Deposit", noshow: "No-Show", no_show: "No-Show", cancelled: "Cancelled",
};

// Outcomes selectable when editing a call (matches the DB check constraint).
const editableOutcomes = [
  "paid_in_full", "split_pay", "offer_declined", "not_a_fit", "deposit_only",
  "no_show", "cancelled", "rescheduled",
];

const presets = [
  { label: "This Month", value: "thismonth" },
  { label: "Last Month", value: "lastmonth" },
  { label: "Last 7 Days", value: "last7" },
  { label: "YTD", value: "ytd" },
];
const outcomes = ["all", "closed", "rescheduled", "lost", "noshow"];

export default function CallLogsPage() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [activePreset, setActivePreset] = useState("thismonth");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;
  const [debriefs, setDebriefs] = useState<Record<string, string>>({});
  const [debriefLoading, setDebriefLoading] = useState<string | null>(null);
  const [closers, setClosers] = useState<{ id: string; full_name: string }[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load closer list for reassignment (admin-only endpoint → 403 for others).
  useEffect(() => {
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.users) return;
        setIsAdmin(true);
        setClosers(d.users.filter((u: { role: string }) => u.role === "closer"));
      })
      .catch(() => {});
  }, []);

  async function handleReassign(callId: string, closerId: string) {
    if (!closerId) return;
    await fetch("/api/calls/reassign", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId, closerId }),
    });
    fetchLogs();
  }

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page), perPage: String(perPage),
      outcome: outcomeFilter, preset: activePreset,
    });
    if (search) params.set("search", search);

    fetch(`/api/call-logs?${params}`)
      .then((r) => r.json())
      .then((d) => { setCalls(d.calls ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [page, outcomeFilter, activePreset, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [outcomeFilter, activePreset, search]);

  const totalPages = Math.ceil(total / perPage);

  async function handleDebrief(call: CallRow) {
    setDebriefLoading(call.id);
    setDebriefs((prev) => ({ ...prev, [call.id]: "" }));
    try {
      const res = await fetch("/api/ai/loss-debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: call.lead_name,
          leadSource: call.lead_source,
          objection: call.objection,
          notes: call.notes,
          closerName: call.closer_name,
        }),
      });
      if (!res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) setDebriefs((prev) => ({ ...prev, [call.id]: (prev[call.id] ?? "") + decoder.decode(value) }));
      }
    } catch {
      setDebriefs((prev) => ({ ...prev, [call.id]: "AI unavailable — please try again." }));
    } finally {
      setDebriefLoading(null);
    }
  }

  const [editCall, setEditCall] = useState<CallRow | null>(null);
  const [saving, setSaving] = useState(false);

  function handleDelete(id: string) {
    if (!confirm("Delete this call log?")) return;
    fetch(`/api/call-logs`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).then((r) => r.json()).then((d) => {
      if (d.error) alert(`Delete failed: ${d.error}`);
      else fetchLogs();
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editCall) return;
    setSaving(true);
    const res = await fetch(`/api/call-logs`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editCall.id,
        lead_name: editCall.lead_name,
        lead_source: editCall.lead_source,
        outcome: editCall.outcome,
        revenue: Number(editCall.revenue ?? 0),
        cash_collected: Number(editCall.cash_collected ?? 0),
        notes: editCall.notes,
        objection: editCall.objection,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (d.error) { alert(`Save failed: ${d.error}`); return; }
    setEditCall(null);
    fetchLogs();
  }

  // Export all calls matching the current filters as a CSV download.
  async function handleExport() {
    const params = new URLSearchParams({ page: "1", perPage: "10000", outcome: outcomeFilter, preset: activePreset });
    if (search) params.set("search", search);
    const d = await fetch(`/api/call-logs?${params}`).then((r) => r.json());
    const rows: CallRow[] = d.calls ?? [];
    const headers = ["Date", "Lead", "Source", "Outcome", "Revenue", "Cash", "Closer", "Tag", "Notes"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.join(",")]
      .concat(rows.map((c) => [c.call_date, c.lead_name, c.lead_source, c.outcome, c.revenue, c.cash_collected, c.closer_name, c.tag, c.notes].map(esc).join(",")))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `call-logs-${activePreset}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout title="Dashboard > Call Logs">
      <div className="space-y-5 animate-fade-in">

        {/* Filters bar */}
        <div className="bg-surface-low border border-border rounded-lg p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lead name..."
              className="w-full bg-surface border border-border pl-8 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-brand"
            />
          </div>

          <div className="flex items-center gap-1 bg-surface border border-border p-1 flex-shrink-0">
            {presets.map((p) => (
              <button
                key={p.value}
                onClick={() => setActivePreset(p.value)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                  activePreset === p.value ? "bg-surface-high text-on-surface" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-surface border border-border p-1 flex-shrink-0">
            {outcomes.map((o) => (
              <button
                key={o}
                onClick={() => setOutcomeFilter(o)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium transition-colors capitalize",
                  outcomeFilter === o ? "bg-surface-high text-on-surface" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                {o === "all" ? "All" : outcomeLabel[o]}
              </button>
            ))}
          </div>

          <button onClick={handleExport} className="flex items-center gap-1.5 border border-border text-on-surface-variant text-xs px-3 py-2 hover:bg-surface-container transition-colors flex-shrink-0">
            <Download size={13} />
            Export
          </button>
        </div>

        {/* Table */}
        <div className="bg-surface-low border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="space-y-px">
              {Array.from({ length: perPage }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse bg-surface-high/50" />
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-on-surface-variant uppercase tracking-wider border-b border-border">
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-3 py-3 font-medium">Lead</th>
                  <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Source</th>
                  <th className="text-left px-3 py-3 font-medium">Outcome</th>
                  <th className="text-right px-3 py-3 font-medium">Revenue</th>
                  <th className="text-left px-3 py-3 font-medium hidden lg:table-cell">Closer</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calls.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-sm text-on-surface-variant">
                      No calls found for the selected filters.
                    </td>
                  </tr>
                )}
                {calls.map((call) => (
                  <>
                    <tr
                      key={call.id}
                      className="hover:bg-surface-container transition-colors cursor-pointer group"
                      onClick={() => setExpandedRow(expandedRow === call.id ? null : call.id)}
                    >
                      <td className="px-5 py-3 text-xs text-on-surface-variant font-mono whitespace-nowrap">
                        {new Date(call.call_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-3 py-3 text-sm text-on-surface font-medium">{call.lead_name}</td>
                      <td className="px-3 py-3 text-xs text-on-surface-variant hidden md:table-cell">{call.lead_source}</td>
                      <td className="px-3 py-3">
                        <span className={cn("text-[11px] font-medium px-2 py-0.5", outcomeBadge[call.outcome] ?? "badge-rescheduled")}>
                          {outcomeLabel[call.outcome] ?? call.outcome}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-mono text-on-surface">
                        {call.revenue ? `$${call.revenue.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-xs text-on-surface-variant hidden lg:table-cell">{call.closer_name}</td>
                      <td className="px-3 py-3 text-right">
                        <ChevronDown
                          size={14}
                          className={cn("text-on-surface-variant transition-transform", expandedRow === call.id && "rotate-180")}
                        />
                      </td>
                    </tr>
                    {expandedRow === call.id && (
                      <tr key={`${call.id}-expand`} className="bg-surface-container">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 flex-1">
                              {call.notes && (
                                <>
                                  <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Notes</p>
                                  <p className="text-sm text-on-surface">{call.notes}</p>
                                </>
                              )}
                              {call.objection && (
                                <p className="text-xs text-on-surface-variant mt-1">Objection: <span className="text-on-surface">{call.objection}</span></p>
                              )}
                              {call.tag && (
                                <p className="text-xs text-on-surface-variant">Tag: <span className="text-on-surface">{call.tag}</span></p>
                              )}
                              <p className="text-xs text-on-surface-variant mt-2">Closer: <span className="text-on-surface">{call.closer_name}</span></p>

                              {isAdmin && closers.length > 0 && (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-xs text-on-surface-variant">Reassign to:</span>
                                  <select
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => { e.stopPropagation(); handleReassign(call.id, e.target.value); }}
                                    defaultValue=""
                                    className="text-xs bg-surface border border-border px-2 py-1 text-on-surface focus:outline-none focus:border-brand"
                                  >
                                    <option value="" disabled>Select closer…</option>
                                    {closers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                  </select>
                                </div>
                              )}

                              {/* AI Debrief — only for lost calls */}
                              {call.outcome === "lost" && (
                                <div className="mt-3 pt-3 border-t border-border">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Sparkles size={12} className="text-brand" />
                                    <span className="text-xs font-semibold text-on-surface">AI Loss Debrief</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDebrief(call); }}
                                      disabled={debriefLoading === call.id}
                                      className={cn(
                                        "ml-auto flex items-center gap-1 text-[11px] text-brand border border-brand/30 px-2 py-0.5 hover:bg-brand/10 transition-colors",
                                        debriefLoading === call.id && "opacity-60 cursor-not-allowed"
                                      )}
                                    >
                                      {debriefLoading === call.id
                                        ? <><RefreshCw size={10} className="animate-spin" /> Analyzing…</>
                                        : <><Sparkles size={10} /> {debriefs[call.id] ? "Regenerate" : "Generate Debrief"}</>}
                                    </button>
                                  </div>
                                  {debriefs[call.id] && (
                                    <div className="space-y-1">
                                      {debriefs[call.id].split("\n").filter(Boolean).map((line, i) => (
                                        <p
                                          key={i}
                                          className="text-xs text-on-surface leading-relaxed"
                                          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
                                        />
                                      ))}
                                      {debriefLoading === call.id && <span className="inline-block w-1.5 h-3 bg-brand animate-pulse" />}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditCall(call); }}
                                className="flex items-center gap-1.5 text-xs text-on-surface-variant border border-border px-3 py-1.5 hover:bg-surface-high transition-colors"
                              >
                                <Pencil size={12} /> Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(call.id); }}
                                className="flex items-center gap-1.5 text-xs text-danger border border-danger/30 px-3 py-1.5 hover:bg-danger/10 transition-colors"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-on-surface-variant">
              {total === 0 ? "No calls" : `Showing ${Math.min((page - 1) * perPage + 1, total)}–${Math.min(page * perPage, total)} of ${total} calls`}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs text-on-surface-variant border border-border px-3 py-1.5 hover:bg-surface-container transition-colors disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="text-xs text-on-surface-variant border border-border px-3 py-1.5 hover:bg-surface-container transition-colors disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Edit modal */}
      {editCall && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditCall(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveEdit}
            className="bg-surface-low border border-border rounded-lg p-6 w-full max-w-md space-y-4 animate-fade-in"
          >
            <h2 className="text-sm font-semibold text-on-surface">Edit Call — {editCall.lead_name}</h2>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-on-surface-variant col-span-2">Lead name
                <input value={editCall.lead_name ?? ""} onChange={(e) => setEditCall({ ...editCall, lead_name: e.target.value })}
                  className="mt-1 w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand" />
              </label>
              <label className="text-xs text-on-surface-variant col-span-2">Source
                <input value={editCall.lead_source ?? ""} onChange={(e) => setEditCall({ ...editCall, lead_source: e.target.value as CallRow["lead_source"] })}
                  className="mt-1 w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand" />
              </label>
              <label className="text-xs text-on-surface-variant col-span-2">Outcome
                <select value={editCall.outcome} onChange={(e) => setEditCall({ ...editCall, outcome: e.target.value as CallRow["outcome"] })}
                  className="mt-1 w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand">
                  {editableOutcomes.map((o) => <option key={o} value={o}>{outcomeLabel[o] ?? o}</option>)}
                </select>
              </label>
              <label className="text-xs text-on-surface-variant">Revenue
                <input type="number" value={editCall.revenue ?? 0} onChange={(e) => setEditCall({ ...editCall, revenue: Number(e.target.value) })}
                  className="mt-1 w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand" />
              </label>
              <label className="text-xs text-on-surface-variant">Cash collected
                <input type="number" value={editCall.cash_collected ?? 0} onChange={(e) => setEditCall({ ...editCall, cash_collected: Number(e.target.value) })}
                  className="mt-1 w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand" />
              </label>
              <label className="text-xs text-on-surface-variant col-span-2">Objection
                <input value={editCall.objection ?? ""} onChange={(e) => setEditCall({ ...editCall, objection: e.target.value })}
                  className="mt-1 w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand" />
              </label>
              <label className="text-xs text-on-surface-variant col-span-2">Notes
                <textarea value={editCall.notes ?? ""} onChange={(e) => setEditCall({ ...editCall, notes: e.target.value })} rows={2}
                  className="mt-1 w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand" />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditCall(null)} className="text-xs text-on-surface-variant border border-border px-4 py-2 hover:bg-surface-container transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className={cn("text-xs font-semibold bg-primary text-on-primary px-4 py-2 hover:bg-primary/90 transition-all", saving && "opacity-60 cursor-not-allowed")}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
