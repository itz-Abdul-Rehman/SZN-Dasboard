"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, ChevronDown, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Call } from "@/lib/db/types";

type TaggedCall = Call & { closer_name: string };
type Tag = "closed" | "follow-up" | "hot-follow-up" | "no-show" | "declined" | "rescheduled";

const tagConfig: Record<Tag, { label: string; className: string }> = {
  "closed":        { label: "Closed",        className: "bg-success/10 text-success border-success/20" },
  "follow-up":     { label: "Follow-Up",     className: "bg-secondary/10 text-secondary border-secondary/20" },
  "hot-follow-up": { label: "Hot Follow-Up", className: "bg-warning/10 text-warning border-warning/20" },
  "no-show":       { label: "No-Show",       className: "bg-warning/10 text-warning border-warning/20" },
  "declined":      { label: "Declined",      className: "bg-danger/10 text-danger border-danger/20" },
  "rescheduled":   { label: "Rescheduled",   className: "bg-brand/10 text-brand border-brand/20" },
};
const allTags = Object.keys(tagConfig) as Tag[];

const untaggedConfig = { label: "Untagged", className: "bg-surface-high text-on-surface-variant border-border" };

export default function LeadTaggingPage() {
  const [leads, setLeads] = useState<TaggedCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [closerFilter, setCloserFilter] = useState("All Closers");
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchLeads = useCallback(() => {
    setLoading(true);
    fetch("/api/lead-tagging")
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function updateTag(callId: string, tag: Tag | null) {
    setSaving(callId);
    setEditingTag(null);
    await fetch("/api/lead-tagging", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId, tag }),
    });
    setLeads((prev) => prev.map((l) => l.id === callId ? { ...l, tag: tag ?? null } : l));
    setSaving(null);
  }

  const closers = ["All Closers", ...Array.from(new Set(leads.map((l) => l.closer_name).filter((n) => n !== "—")))];

  const filtered = leads.filter((l) => {
    const matchTag = tagFilter === "all" || l.tag === tagFilter || (tagFilter === "untagged" && !l.tag);
    const matchCloser = closerFilter === "All Closers" || l.closer_name === closerFilter;
    const matchSearch = l.lead_name.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchCloser && matchSearch;
  });

  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = leads.filter((l) => l.tag === tag).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout title="Dashboard > Lead Tagging">
      <div className="space-y-5 animate-fade-in">

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTagFilter("all")}
            className={cn("px-3 py-1.5 text-xs font-medium border transition-colors",
              tagFilter === "all" ? "bg-surface-high text-on-surface border-border" : "bg-surface-low text-on-surface-variant border-border hover:text-on-surface"
            )}
          >
            All ({leads.length})
          </button>
          <button
            onClick={() => setTagFilter("untagged")}
            className={cn("px-3 py-1.5 text-xs font-medium border transition-colors",
              tagFilter === "untagged" ? "bg-surface-high text-on-surface border-border" : "bg-surface-low text-on-surface-variant border-border hover:text-on-surface"
            )}
          >
            Untagged ({leads.filter((l) => !l.tag).length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? "all" : tag)}
              className={cn("px-3 py-1.5 text-xs font-medium border transition-colors",
                tagFilter === tag ? tagConfig[tag].className : "bg-surface-low text-on-surface-variant border-border hover:text-on-surface"
              )}
            >
              {tagConfig[tag].label} ({tagCounts[tag]})
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="w-full bg-surface-low border border-border pl-8 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-brand"
            />
          </div>
          <div className="relative">
            <UserCheck size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <select
              value={closerFilter}
              onChange={(e) => setCloserFilter(e.target.value)}
              className="bg-surface-low border border-border pl-8 pr-8 py-2 text-xs text-on-surface focus:outline-none focus:border-brand appearance-none"
            >
              {closers.map((c) => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface-low border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 animate-pulse bg-surface-high rounded" />)}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[11px] text-on-surface-variant uppercase tracking-wider border-b border-border">
                  <th className="text-left px-5 py-3 font-medium">Lead</th>
                  <th className="text-left px-3 py-3 font-medium hidden md:table-cell">Source</th>
                  <th className="text-left px-3 py-3 font-medium">Tag</th>
                  <th className="text-left px-3 py-3 font-medium hidden lg:table-cell">Closer</th>
                  <th className="text-left px-3 py-3 font-medium hidden sm:table-cell">Date</th>
                  <th className="text-right px-5 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-on-surface-variant">No leads match your filters.</td></tr>
                )}
                {filtered.map((lead) => {
                  const currentTag = (lead.tag as Tag | null) ?? null;
                  const cfg = currentTag ? tagConfig[currentTag] : untaggedConfig;
                  return (
                    <tr key={lead.id} className="hover:bg-surface-container transition-colors group">
                      <td className="px-5 py-3 text-sm text-on-surface font-medium">{lead.lead_name}</td>
                      <td className="px-3 py-3 text-xs text-on-surface-variant hidden md:table-cell">{lead.lead_source}</td>
                      <td className="px-3 py-3">
                        <div className="relative">
                          <button
                            onClick={() => setEditingTag(editingTag === lead.id ? null : lead.id)}
                            disabled={saving === lead.id}
                            className={cn(
                              "flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 border transition-colors",
                              cfg.className
                            )}
                          >
                            {saving === lead.id ? "Saving…" : cfg.label}
                            <ChevronDown size={10} />
                          </button>
                          {editingTag === lead.id && (
                            <div className="absolute left-0 top-full mt-1 z-20 bg-surface-high border border-border shadow-modal overflow-hidden min-w-[160px]">
                              <button
                                onClick={() => updateTag(lead.id, null)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-highest transition-colors text-on-surface-variant"
                              >
                                <span className="w-1.5 h-1.5 bg-on-surface-variant" />
                                Untagged
                              </button>
                              {allTags.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() => updateTag(lead.id, tag)}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-highest transition-colors",
                                    currentTag === tag ? "text-on-surface font-medium" : "text-on-surface-variant"
                                  )}
                                >
                                  <span className={cn("w-1.5 h-1.5", tagConfig[tag].className.split(" ")[1])} />
                                  {tagConfig[tag].label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-on-surface-variant hidden lg:table-cell">{lead.closer_name}</td>
                      <td className="px-3 py-3 text-xs text-on-surface-variant hidden sm:table-cell">
                        {new Date(lead.call_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-mono text-on-surface">
                        {lead.revenue ? `$${lead.revenue.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="px-5 py-3 border-t border-border">
            <span className="text-xs text-on-surface-variant">{filtered.length} leads</span>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
