import { createClient } from "@/lib/supabase/server";
import { toUSD } from "@/lib/exchange-rate";
import type {
  MasterKpis, CloserLeaderboardRow, ClientGoalProgress,
  Call, AdCampaign, DailyMetric, Profile, SetterLog,
} from "./types";

// ─── Master Dashboard ────────────────────────────────────────

export async function getMasterKpis(): Promise<MasterKpis> {
  const supabase = await createClient();

  const { data: calls } = await supabase
    .from("calls")
    .select("outcome, revenue, clients(currency)");

  const { data: ads } = await supabase
    .from("ad_campaigns")
    .select("spend, roas")
    .eq("status", "active");

  const closed = calls?.filter((c) => c.outcome === "closed") ?? [];
  const no_shows = calls?.filter((c) => c.outcome === "noshow").length ?? 0;

  // Convert each closed call's revenue to USD
  const revenueAmounts = await Promise.all(
    closed.map(async (c) => {
      const currency = (c.clients as unknown as { currency: string } | null)?.currency ?? "USD";
      return toUSD(c.revenue ?? 0, currency);
    })
  );

  const total_revenue = revenueAmounts.reduce((s, v) => s + v, 0);
  const close_rate = calls?.length ? (closed.length / calls.length) * 100 : 0;
  const avg_deal_size = closed.length ? total_revenue / closed.length : 0;
  const ad_spend = ads?.reduce((s, a) => s + (a.spend ?? 0), 0) ?? 0;
  const roas = ads?.length ? ads.reduce((s, a) => s + (a.roas ?? 0), 0) / ads.length : 0;

  return {
    total_revenue,
    cash_collected: total_revenue * 0.82,
    calls_booked: calls?.length ?? 0,
    close_rate,
    avg_deal_size,
    no_shows,
    roas,
    ad_spend,
  };
}

export async function getCloserLeaderboard(): Promise<CloserLeaderboardRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("calls")
    .select("closer_id, outcome, revenue, profiles!closer_id(full_name)");

  if (!data) return [];

  const map = new Map<string, { full_name: string; revenue: number; calls: number; closed: number }>();

  for (const row of data) {
    if (!row.closer_id) continue;
    const name = (row.profiles as unknown as { full_name: string } | null)?.full_name ?? "Unknown";
    const existing = map.get(row.closer_id) ?? { full_name: name, revenue: 0, calls: 0, closed: 0 };
    existing.calls += 1;
    if (row.outcome === "closed") {
      existing.closed += 1;
      existing.revenue += row.revenue ?? 0;
    }
    map.set(row.closer_id, existing);
  }

  return Array.from(map.entries())
    .map(([closer_id, v]) => ({
      closer_id,
      full_name: v.full_name,
      revenue: v.revenue,
      calls: v.calls,
      close_rate: v.calls > 0 ? (v.closed / v.calls) * 100 : 0,
      trend_up: v.revenue > 80000 ? true : v.revenue < 50000 ? false : null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

export async function getClientGoalProgress(): Promise<ClientGoalProgress[]> {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, currency, revenue_goal, calls_goal")
    .eq("active", true);

  if (!clients) return [];

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const { data: calls } = await supabase
    .from("calls")
    .select("client_id, outcome, revenue")
    .gte("call_date", monthStartStr);

  return Promise.all(
    clients.map(async (c) => {
      const clientCalls = calls?.filter((ca) => ca.client_id === c.id) ?? [];
      const closed = clientCalls.filter((ca) => ca.outcome === "closed");
      const revenueAmounts = await Promise.all(
        closed.map((ca) => toUSD(ca.revenue ?? 0, c.currency ?? "USD"))
      );
      const rev_goal_usd = await toUSD(c.revenue_goal, c.currency ?? "USD");
      return {
        client_id: c.id,
        name: c.name,
        rev_current: revenueAmounts.reduce((s, v) => s + v, 0),
        rev_goal: rev_goal_usd,
        calls_current: clientCalls.length,
        calls_goal: c.calls_goal,
      };
    })
  );
}

export async function getRevenueChartData(): Promise<{ day: string; value: number }[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - 6);
  const sinceStr = since.toISOString().split("T")[0];

  const { data } = await supabase
    .from("daily_metrics")
    .select("metric_date, revenue")
    .gte("metric_date", sinceStr)
    .order("metric_date", { ascending: true });

  if (!data?.length) return [];

  const grouped = new Map<string, number>();
  for (const row of data) {
    grouped.set(row.metric_date, (grouped.get(row.metric_date) ?? 0) + row.revenue);
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return Array.from(grouped.entries()).map(([date, value]) => ({
    day: days[new Date(date + "T12:00:00").getDay()],
    value,
  }));
}

// ─── Sales / Closer Dashboard ────────────────────────────────

export async function getTodaysCalls(closerId?: string): Promise<Call[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("calls")
    .select("*")
    .eq("call_date", today)
    .order("call_time", { ascending: false });

  if (closerId) query = query.eq("closer_id", closerId);

  const { data } = await query;
  return (data as Call[]) ?? [];
}

export async function getSalesKpis(closerId?: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  let query = supabase
    .from("calls")
    .select("outcome, revenue")
    .eq("call_date", today);

  if (closerId) query = query.eq("closer_id", closerId);

  const { data: calls } = await query;

  const closed = calls?.filter((c) => c.outcome === "closed") ?? [];
  const revenue = closed.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const close_rate = calls?.length ? (closed.length / calls.length) * 100 : 0;
  const avg_deal = closed.length ? revenue / closed.length : 0;

  return {
    revenue,
    calls_today: calls?.length ?? 0,
    close_rate,
    avg_deal_size: avg_deal,
  };
}

export async function logCall(payload: {
  client_id?: string | null;
  closer_id: string;
  lead_name: string;
  lead_source: string;
  outcome: string;
  revenue: number;
  notes?: string;
  objection?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("calls").insert(payload);
  if (error) throw error;
}

// ─── Ads Dashboard ───────────────────────────────────────────

export async function getAdCampaigns(clientId?: string): Promise<AdCampaign[]> {
  const supabase = await createClient();

  let query = supabase
    .from("ad_campaigns")
    .select("*")
    .order("spend", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);

  const { data } = await query;
  return (data as AdCampaign[]) ?? [];
}

export async function getAdsKpis(clientId?: string) {
  const campaigns = await getAdCampaigns(clientId);
  const active = campaigns.filter((c) => c.status === "active");

  const total_spend = campaigns.reduce((s, c) => s + c.spend, 0);
  const total_impressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const total_results = campaigns.reduce((s, c) => s + c.results, 0);
  const avg_roas = active.length ? active.reduce((s, c) => s + c.roas, 0) / active.length : 0;
  const avg_ctr = campaigns.length ? campaigns.reduce((s, c) => s + c.ctr, 0) / campaigns.length : 0;
  const cost_per_result = total_results > 0 ? total_spend / total_results : 0;

  return { total_spend, total_impressions, total_results, avg_roas, avg_ctr, cost_per_result };
}

export async function getAdSpendChart(clientId?: string): Promise<DailyMetric[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - 13);

  let query = supabase
    .from("daily_metrics")
    .select("metric_date, ad_spend")
    .gte("metric_date", since.toISOString().split("T")[0])
    .order("metric_date", { ascending: true });

  if (clientId) query = query.eq("client_id", clientId);

  const { data } = await query;
  return (data as DailyMetric[]) ?? [];
}

// ─── Call Logs ───────────────────────────────────────────────

export async function getCallLogs(params: {
  page?: number;
  perPage?: number;
  search?: string;
  outcome?: string;
  preset?: string;
}): Promise<{ calls: (Call & { closer_name: string })[]; total: number }> {
  const supabase = await createClient();
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 8;

  let query = supabase
    .from("calls")
    .select("*, profiles!closer_id(full_name)", { count: "exact" })
    .order("call_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.outcome && params.outcome !== "all") {
    query = query.eq("outcome", params.outcome);
  }

  if (params.search) {
    query = query.ilike("lead_name", `%${params.search}%`);
  }

  const today = new Date();
  if (params.preset === "last7") {
    const d = new Date(); d.setDate(d.getDate() - 6);
    query = query.gte("call_date", d.toISOString().split("T")[0]);
  } else if (params.preset === "thismonth") {
    query = query.gte("call_date", `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`);
  } else if (params.preset === "lastmonth") {
    const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lme = new Date(today.getFullYear(), today.getMonth(), 0);
    query = query.gte("call_date", lm.toISOString().split("T")[0]).lte("call_date", lme.toISOString().split("T")[0]);
  } else if (params.preset === "ytd") {
    query = query.gte("call_date", `${today.getFullYear()}-01-01`);
  }

  const { data, count } = await query.range((page - 1) * perPage, page * perPage - 1);
  const calls = (data ?? []).map((row) => ({
    ...row,
    closer_name: (row.profiles as unknown as { full_name: string } | null)?.full_name ?? "—",
  }));

  return { calls: calls as (Call & { closer_name: string })[], total: count ?? 0 };
}

export async function getCallOutcomeDistribution() {
  const supabase = await createClient();
  const { data } = await supabase.from("calls").select("outcome");
  if (!data?.length) return [];

  const counts = { closed: 0, rescheduled: 0, noshow: 0, lost: 0 };
  for (const c of data) {
    if (c.outcome in counts) counts[c.outcome as keyof typeof counts]++;
  }
  return [
    { name: "Closed",      value: counts.closed,      color: "#10B981" },
    { name: "Rescheduled", value: counts.rescheduled,  color: "#adc6ff" },
    { name: "No-Show",     value: counts.noshow,       color: "#F59E0B" },
    { name: "Lost/Disq",   value: counts.lost,         color: "#EF4444" },
  ];
}

// ─── Leaderboard ─────────────────────────────────────────────

export async function getFullLeaderboard() {
  const supabase = await createClient();

  const { data: callData } = await supabase
    .from("calls")
    .select("closer_id, outcome, revenue, profiles!closer_id(full_name)");

  const map = new Map<string, { full_name: string; revenue: number; calls: number; closed: number }>();
  for (const row of callData ?? []) {
    if (!row.closer_id) continue;
    const name = (row.profiles as unknown as { full_name: string } | null)?.full_name ?? "Unknown";
    const existing = map.get(row.closer_id) ?? { full_name: name, revenue: 0, calls: 0, closed: 0 };
    existing.calls += 1;
    if (row.outcome === "closed") { existing.closed += 1; existing.revenue += row.revenue ?? 0; }
    map.set(row.closer_id, existing);
  }

  const closers = Array.from(map.entries())
    .map(([closer_id, v]) => ({
      closer_id, full_name: v.full_name, revenue: v.revenue, calls: v.calls,
      close_rate: v.calls > 0 ? (v.closed / v.calls) * 100 : 0,
      trend_up: v.revenue > 80000 ? true : v.revenue < 50000 ? false : null,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const { data: setterData } = await supabase
    .from("setter_logs")
    .select("setter_id, calls_booked, conversations, profiles!setter_id(full_name)");

  const setterMap = new Map<string, { full_name: string; calls_booked: number; conversations: number }>();
  for (const row of setterData ?? []) {
    if (!row.setter_id) continue;
    const name = (row.profiles as unknown as { full_name: string } | null)?.full_name ?? "Unknown";
    const existing = setterMap.get(row.setter_id) ?? { full_name: name, calls_booked: 0, conversations: 0 };
    existing.calls_booked += row.calls_booked ?? 0;
    existing.conversations += row.conversations ?? 0;
    setterMap.set(row.setter_id, existing);
  }

  const setters = Array.from(setterMap.entries())
    .map(([setter_id, v]) => ({
      setter_id, full_name: v.full_name, calls_booked: v.calls_booked,
      conv_rate: v.conversations > 0 ? (v.calls_booked / v.conversations) * 100 : 0,
    }))
    .sort((a, b) => b.calls_booked - a.calls_booked);

  return { closers, setters };
}

// ─── Setter Dashboard ─────────────────────────────────────────

export async function getSetterLogs(setterId?: string): Promise<SetterLog[]> {
  const supabase = await createClient();

  let query = supabase
    .from("setter_logs")
    .select("*, profiles!setter_id(full_name)")
    .order("log_date", { ascending: false })
    .limit(30);

  if (setterId) query = query.eq("setter_id", setterId);

  const { data } = await query;
  return (data as SetterLog[]) ?? [];
}

export async function logSetterDay(payload: {
  setter_id: string;
  log_date: string;
  conversations: number;
  replies: number;
  proposals: number;
  calls_booked: number;
  follow_ups: number;
}) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("setter_logs")
    .select("id")
    .eq("setter_id", payload.setter_id)
    .eq("log_date", payload.log_date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("setter_logs").update(payload).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("setter_logs").insert(payload);
    if (error) throw error;
  }
}

// ─── Lead Tagging ─────────────────────────────────────────────

export async function getTaggableLeads(): Promise<(Call & { closer_name: string })[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("calls")
    .select("*, profiles!closer_id(full_name)")
    .order("call_date", { ascending: false })
    .limit(100);

  return (data ?? []).map((row) => ({
    ...row,
    closer_name: (row.profiles as unknown as { full_name: string } | null)?.full_name ?? "—",
  })) as (Call & { closer_name: string })[];
}

export async function updateCallTag(callId: string, tag: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("calls").update({ tag }).eq("id", callId);
  if (error) throw error;
}

// ─── Auth helpers ─────────────────────────────────────────────

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}
