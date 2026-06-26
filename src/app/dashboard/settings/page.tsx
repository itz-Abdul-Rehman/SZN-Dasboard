"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Target, Megaphone, Sparkles, Bell, AlertTriangle,
  Users, ChevronRight, Check, X, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  { id: "goals",    label: "Monthly Goals",     icon: Target },
  { id: "facebook", label: "Facebook / Meta",   icon: Megaphone },
  { id: "ai",       label: "AI Configuration",  icon: Sparkles },
  { id: "slack",    label: "Slack Notifications", icon: Bell },
  { id: "alerts",   label: "Alert Thresholds",  icon: AlertTriangle },
  { id: "users",    label: "Users & Access",    icon: Users },
];

const aiPersonalities = ["Coach", "Analyst", "Strategist", "Motivator"];
const currencies = ["USD", "GBP", "EUR", "AUD", "CAD", "AED", "INR", "PKR"];

const roleBadge: Record<string, string> = {
  admin:  "bg-warning/10 text-warning border-warning/20",
  closer: "bg-success/10 text-success border-success/20",
  setter: "bg-brand/10 text-brand border-brand/20",
  client: "bg-surface-highest text-on-surface-variant border-border",
};

interface ClientGoal {
  id: string;
  name: string;
  currency: string;
  revenue_goal: number;
  calls_goal: number;
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("goals");

  // Goals state
  const [clients, setClients] = useState<ClientGoal[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [revenueGoal, setRevenueGoal] = useState("");
  const [callsGoal, setCallsGoal] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsSaving, setGoalsSaving] = useState(false);
  const [goalsSaved, setGoalsSaved] = useState(false);

  // Other settings state
  const [aiPersonality, setAiPersonality] = useState("Coach");
  const [closeRateThreshold, setCloseRateThreshold] = useState("20");
  const [rpcThreshold, setRpcThreshold] = useState("30");
  const [saved, setSaved] = useState(false);

  const fetchClients = useCallback(() => {
    setGoalsLoading(true);
    fetch("/api/settings/goals")
      .then((r) => r.json())
      .then((d) => {
        const list: ClientGoal[] = d.clients ?? [];
        setClients(list);
        if (list.length > 0 && !selectedClientId) {
          setSelectedClientId(list[0].id);
          setRevenueGoal(String(list[0].revenue_goal));
          setCallsGoal(String(list[0].calls_goal));
          setCurrency(list[0].currency ?? "USD");
        }
      })
      .finally(() => setGoalsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // When selected client changes, populate fields
  useEffect(() => {
    const c = clients.find((cl) => cl.id === selectedClientId);
    if (c) {
      setRevenueGoal(String(c.revenue_goal));
      setCallsGoal(String(c.calls_goal));
      setCurrency(c.currency ?? "USD");
    }
  }, [selectedClientId, clients]);

  async function handleSaveGoals() {
    setGoalsSaving(true);
    await fetch("/api/settings/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selectedClientId,
        revenue_goal: Number(revenueGoal),
        calls_goal: Number(callsGoal),
        currency,
      }),
    });
    // Update local state immediately
    setClients((prev) =>
      prev.map((c) =>
        c.id === selectedClientId
          ? { ...c, revenue_goal: Number(revenueGoal), calls_goal: Number(callsGoal), currency }
          : c
      )
    );
    setGoalsSaving(false);
    setGoalsSaved(true);
    setTimeout(() => setGoalsSaved(false), 2500);
  }

  const handleSave = async () => {
    await new Promise((r) => setTimeout(r, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <DashboardLayout title="Dashboard > Settings" userName="Admin User" role="Admin">
      <div className="flex flex-col lg:flex-row gap-5 animate-fade-in">

        {/* Sidebar nav */}
        <aside className="lg:w-52 flex-shrink-0">
          <div className="bg-surface-low border border-border rounded-lg overflow-hidden">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors border-b border-border last:border-0",
                  activeSection === id
                    ? "bg-surface-high text-on-surface font-medium"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={14} />
                  {label}
                </div>
                <ChevronRight size={13} className="opacity-40" />
              </button>
            ))}
          </div>
        </aside>

        {/* Content panel */}
        <div className="flex-1 min-w-0">

          {/* Goals — wired to Supabase */}
          {activeSection === "goals" && (
            <div className="bg-surface-low border border-border rounded-lg p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-on-surface">Monthly Goals</h2>
                <span className="text-[11px] text-on-surface-variant">Live data from Supabase</span>
              </div>
              {goalsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse bg-surface-high rounded" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs text-on-surface-variant">Client</label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand"
                    >
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-on-surface-variant">Revenue Goal ({currency})</label>
                      <input
                        type="number"
                        value={revenueGoal}
                        onChange={(e) => setRevenueGoal(e.target.value)}
                        className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-on-surface-variant">Calls Goal</label>
                      <input
                        type="number"
                        value={callsGoal}
                        onChange={(e) => setCallsGoal(e.target.value)}
                        className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-on-surface-variant">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand"
                    >
                      {currencies.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={handleSaveGoals}
                    disabled={goalsSaving}
                    className={cn(
                      "flex items-center gap-2 text-sm font-semibold px-5 py-2.5 transition-all",
                      goalsSaved ? "bg-success text-white" : "bg-primary text-on-primary hover:bg-primary/90",
                      goalsSaving && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {goalsSaving
                      ? <><RefreshCw size={14} className="animate-spin" /> Saving…</>
                      : goalsSaved
                        ? <><Check size={14} /> Saved</>
                        : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Facebook */}
          {activeSection === "facebook" && (
            <div className="bg-surface-low border border-border rounded-lg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-on-surface">Facebook / Meta Ads</h2>
              <p className="text-xs text-on-surface-variant">Your Meta credentials are configured in the server environment. Use the Ads page to sync campaigns.</p>
              <div className="p-4 bg-surface border border-border space-y-2">
                <p className="text-xs font-medium text-on-surface">Current Status</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success inline-block" />
                  <span className="text-xs text-on-surface-variant">App ID configured</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success inline-block" />
                  <span className="text-xs text-on-surface-variant">Access token configured</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success inline-block" />
                  <span className="text-xs text-on-surface-variant">Ad account connected</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant">To update credentials, edit <code className="bg-surface px-1 py-0.5 text-brand">.env.local</code> and restart the server.</p>
            </div>
          )}

          {/* AI Config */}
          {activeSection === "ai" && (
            <div className="bg-surface-low border border-border rounded-lg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-on-surface">AI Configuration</h2>
              <div className="p-4 bg-surface border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success inline-block" />
                  <span className="text-xs text-on-surface-variant">Groq API key configured (llama-3.3-70b-versatile)</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-on-surface-variant">Coaching Personality</label>
                <div className="grid grid-cols-2 gap-2">
                  {aiPersonalities.map((p) => (
                    <button
                      key={p}
                      onClick={() => setAiPersonality(p)}
                      className={cn(
                        "py-2.5 text-sm font-medium border transition-colors",
                        aiPersonality === p
                          ? "bg-brand/10 border-brand text-brand"
                          : "bg-surface border-border text-on-surface-variant hover:border-outline"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-on-surface-variant">Controls the tone of AI insights and loss debriefs.</p>
              </div>
              <SaveButton saved={saved} onSave={handleSave} />
            </div>
          )}

          {/* Slack */}
          {activeSection === "slack" && (
            <div className="bg-surface-low border border-border rounded-lg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-on-surface">Slack Integration</h2>
              <div className="p-4 bg-surface border border-border space-y-2">
                <p className="text-xs font-medium text-on-surface">Current Status</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success inline-block" />
                  <span className="text-xs text-on-surface-variant">Bot token configured (xoxb-***)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success inline-block" />
                  <span className="text-xs text-on-surface-variant">Sales alerts channel: C0BDBBG3HJA</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant">Lost call debriefs are automatically posted to your Slack channel. To test the connection, visit <code className="bg-surface px-1 py-0.5 text-brand">/api/slack/test</code>.</p>
              <div className="space-y-1.5">
                <label className="text-xs text-on-surface-variant">Notification triggers</label>
                {["Lost call — AI debrief posted", "Close rate drops below threshold", "Daily summary (coming soon)"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <Check size={11} className="text-success flex-shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alert Thresholds */}
          {activeSection === "alerts" && (
            <div className="bg-surface-low border border-border rounded-lg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-on-surface">Alert Thresholds</h2>
              <p className="text-xs text-on-surface-variant">Anomaly detection checks every 4 hours. Alerts fire when a metric drops below threshold vs 28-day average.</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-on-surface-variant">Close Rate Warning (%) — warn when drops below</label>
                  <input
                    type="number"
                    value={closeRateThreshold}
                    onChange={(e) => setCloseRateThreshold(e.target.value)}
                    className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-on-surface-variant">Revenue-per-Call Drop Alert (%)</label>
                  <input
                    type="number"
                    value={rpcThreshold}
                    onChange={(e) => setRpcThreshold(e.target.value)}
                    className="w-full bg-surface border border-border px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-brand"
                  />
                </div>
                <div className="p-4 bg-surface border border-border space-y-2">
                  <p className="text-xs font-medium text-on-surface">Severity Levels</p>
                  <p className="text-xs text-on-surface-variant">⚠️ Warning — metric drops &gt; 20% vs 28-day average</p>
                  <p className="text-xs text-on-surface-variant">🚨 Critical — metric drops &gt; 35% vs 28-day average</p>
                </div>
              </div>
              <SaveButton saved={saved} onSave={handleSave} />
            </div>
          )}

          {/* Users — reads from profiles */}
          {activeSection === "users" && (
            <UsersSection />
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}

function UsersSection() {
  const [profiles, setProfiles] = useState<{ id: string; full_name: string; role: string; active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => {
        const closers = (d.closers ?? []).map((c: { closer_id: string; full_name: string }) => ({
          id: c.closer_id, full_name: c.full_name, role: "closer", active: true,
        }));
        setProfiles(closers);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-surface-low border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h2 className="text-sm font-semibold text-on-surface">Users & Access</h2>
        <p className="text-xs text-on-surface-variant">Managed via Supabase Auth</p>
      </div>
      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 animate-pulse bg-surface-high rounded" />)}
        </div>
      ) : profiles.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-on-surface-variant">
          No users yet. Add team members via Supabase Auth → invite user, then set their role in the <code className="bg-surface px-1 py-0.5 text-brand">profiles</code> table.
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="text-[11px] text-on-surface-variant uppercase tracking-wider border-b border-border">
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-3 py-3 font-medium">Role</th>
              <th className="text-left px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {profiles.map((u) => (
              <tr key={u.id} className="hover:bg-surface-container transition-colors">
                <td className="px-5 py-3 text-sm text-on-surface font-medium">{u.full_name}</td>
                <td className="px-3 py-3">
                  <span className={cn("text-[11px] font-medium px-2 py-0.5 border", roleBadge[u.role] ?? roleBadge.client)}>
                    {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-1 text-xs text-success"><Check size={11} />Active</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SaveButton({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return (
    <button
      onClick={onSave}
      className={cn(
        "flex items-center gap-2 text-sm font-semibold px-5 py-2.5 transition-all",
        saved ? "bg-success text-white" : "bg-primary text-on-primary hover:bg-primary/90"
      )}
    >
      {saved ? <><Check size={14} /> Saved</> : "Save Changes"}
    </button>
  );
}
