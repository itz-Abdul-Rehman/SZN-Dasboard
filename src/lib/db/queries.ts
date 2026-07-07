import { createClient } from "@/lib/supabase/server";
import { toUSD } from "@/lib/exchange-rate";
import type {
  MasterKpis, SalesKpis, AdsKpis, SetterPeriodKpis, SetterAttribution,
  CloserLeaderboardRow, ClientGoalProgress,
  Call, AdCampaign, DailyMetric, Profile, SetterLog,
} from "./types";
import { WON_OUTCOMES, SHOWED_NOT_CLOSED, NOSHOW_OUTCOMES } from "./types";

// ─── Shared helpers ───────────────────────────────────────────

function monthStart(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function daysInCurrentMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function currentDayOfMonth(): number {
  return new Date().getDate();
}

function isWon(outcome: string) { return WON_OUTCOMES.includes(outcome as never); }
function isShowedNotClosed(outcome: string) { return SHOWED_NOT_CLOSED.includes(outcome as never); }
function isNoShow(outcome: string) { return NOSHOW_OUTCOMES.includes(outcome as never); }
function isRescheduled(outcome: string) { return outcome === "rescheduled"; }
function isPif(outcome: string) { return outcome === "paid_in_full" || outcome === "closed"; }

// ─── Master Dashboard ────────────────────────────────────────

export async function getMasterKpis(): Promise<MasterKpis> {
  const supabase = await createClient();
  const ms = monthStart();

  const [{ data: calls }, { data: adDays }, { data: setterLogs }] = await Promise.all([
    supabase
      .from("calls")
      .select("outcome, revenue, cash_collected, clients(currency)")
      .gte("call_date", ms),
    // Month-to-date ad spend (already stored in USD) so ROAS is period-consistent
    // with the month-to-date revenue above.
    supabase
      .from("daily_metrics")
      .select("ad_spend")
      .gte("metric_date", ms),
    supabase
      .from("setter_logs")
      .select("calls_booked")
      .gte("log_date", ms),
  ]);

  const won = (calls ?? []).filter((c) => isWon(c.outcome));
  const showedNotClosed = (calls ?? []).filter((c) => isShowedNotClosed(c.outcome));
  const noShows = (calls ?? []).filter((c) => isNoShow(c.outcome));
  const calls_taken = (calls ?? []).filter((c) => !isRescheduled(c.outcome)).length;
  const calls_shown = won.length + showedNotClosed.length;

  // Revenue — convert each won call to USD
  const revenueAmounts = await Promise.all(
    won.map(async (c) => {
      const currency = (c.clients as unknown as { currency: string } | null)?.currency ?? "USD";
      return toUSD(c.revenue ?? 0, currency);
    })
  );
  const total_revenue = revenueAmounts.reduce((s, v) => s + v, 0);

  // Cash collected — split_pay uses cash_collected field; pif/closed uses full revenue
  const cashAmounts = await Promise.all(
    won.map(async (c) => {
      const currency = (c.clients as unknown as { currency: string } | null)?.currency ?? "USD";
      const cash = c.outcome === "split_pay" ? (c.cash_collected ?? 0) : (c.revenue ?? 0);
      return toUSD(cash, currency);
    })
  );
  const cash_collected = cashAmounts.reduce((s, v) => s + v, 0);

  const close_rate = calls_shown > 0 ? (won.length / calls_shown) * 100 : 0;
  const show_up_rate = (calls_shown + noShows.length) > 0
    ? (calls_shown / (calls_shown + noShows.length)) * 100
    : 0;
  const avg_deal_size = won.length > 0 ? total_revenue / won.length : 0;
  const ad_spend = (adDays ?? []).reduce((s, a) => s + (a.ad_spend ?? 0), 0);
  const roas = ad_spend > 0 ? total_revenue / ad_spend : 0;
  const booked_calls = (setterLogs ?? []).reduce((s, l) => s + (l.calls_booked ?? 0), 0);

  // Pacing: (revenue so far / days elapsed) * days in month
  const dayElapsed = currentDayOfMonth();
  const pacing = dayElapsed > 0 ? (total_revenue / dayElapsed) * daysInCurrentMonth() : 0;

  return {
    total_revenue,
    cash_collected,
    calls_taken,
    booked_calls,
    deals_won: won.length,
    close_rate,
    show_up_rate,
    no_shows: noShows.length,
    avg_deal_size,
    roas,
    ad_spend,
    pacing,
  };
}

export async function getCloserLeaderboard(): Promise<CloserLeaderboardRow[]> {
  const supabase = await createClient();
  const ms = monthStart();

  const { data } = await supabase
    .from("calls")
    .select("closer_id, outcome, revenue, profiles!closer_id(full_name), clients(currency)")
    .gte("call_date", ms);

  if (!data) return [];

  const map = new Map<string, { full_name: string; revenue: number; calls: number; won: number; shown: number; noshow: number }>();

  for (const row of data) {
    if (!row.closer_id) continue;
    const name = (row.profiles as unknown as { full_name: string } | null)?.full_name ?? "Unknown";
    const currency = (row.clients as unknown as { currency: string } | null)?.currency ?? "USD";
    const e = map.get(row.closer_id) ?? { full_name: name, revenue: 0, calls: 0, won: 0, shown: 0, noshow: 0 };
    if (!isRescheduled(row.outcome)) e.calls += 1;
    if (isWon(row.outcome)) { e.won += 1; e.revenue += await toUSD(row.revenue ?? 0, currency); }
    if (isWon(row.outcome) || isShowedNotClosed(row.outcome)) e.shown += 1;
    if (isNoShow(row.outcome)) e.noshow += 1;
    map.set(row.closer_id, e);
  }

  return Array.from(map.entries())
    .map(([closer_id, v]) => ({
      closer_id,
      full_name: v.full_name,
      revenue: v.revenue,
      calls: v.calls,
      close_rate: v.shown > 0 ? (v.won / v.shown) * 100 : 0,
      show_up_rate: (v.shown + v.noshow) > 0 ? (v.shown / (v.shown + v.noshow)) * 100 : 0,
      trend_up: null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

export async function getClientGoalProgress(): Promise<ClientGoalProgress[]> {
  const supabase = await createClient();
  const ms = monthStart();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, currency, revenue_goal, calls_goal")
    .eq("active", true);

  if (!clients) return [];

  const { data: calls } = await supabase
    .from("calls")
    .select("client_id, outcome, revenue")
    .gte("call_date", ms);

  return Promise.all(
    clients.map(async (c) => {
      const clientCalls = (calls ?? []).filter((ca) => ca.client_id === c.id);
      const closed = clientCalls.filter((ca) => isWon(ca.outcome));
      const revenueAmounts = await Promise.all(
        closed.map((ca) => toUSD(ca.revenue ?? 0, c.currency ?? "USD"))
      );
      const rev_goal_usd = await toUSD(c.revenue_goal, c.currency ?? "USD");
      return {
        client_id: c.id,
        name: c.name,
        rev_current: revenueAmounts.reduce((s, v) => s + v, 0),
        rev_goal: rev_goal_usd,
        calls_current: clientCalls.filter((ca) => !isRescheduled(ca.outcome)).length,
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

  // Spec: each point is the sum of USD revenue for closed-deal calls on that
  // date. Computed live from `calls` (not the unpopulated daily_metrics table).
  const { data } = await supabase
    .from("calls")
    .select("call_date, outcome, revenue, clients(currency)")
    .gte("call_date", sinceStr);

  const won = (data ?? []).filter((c) => isWon(c.outcome));
  const grouped = new Map<string, number>();
  await Promise.all(
    won.map(async (c) => {
      const currency = (c.clients as unknown as { currency: string } | null)?.currency ?? "USD";
      const usd = await toUSD(c.revenue ?? 0, currency);
      grouped.set(c.call_date, (grouped.get(c.call_date) ?? 0) + usd);
    })
  );

  // Return a continuous 7-day window so days with no closed deals show as zero.
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const out: { day: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    out.push({ day: days[d.getDay()], value: grouped.get(key) ?? 0 });
  }
  return out;
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

export async function getSalesKpis(closerId?: string): Promise<SalesKpis> {
  const supabase = await createClient();
  const ms = monthStart();

  let query = supabase
    .from("calls")
    .select("outcome, revenue, cash_collected, objection, clients(currency)")
    .gte("call_date", ms);

  if (closerId) query = query.eq("closer_id", closerId);

  const { data: calls } = await query;

  const won = (calls ?? []).filter((c) => isWon(c.outcome));
  const showedNotClosed = (calls ?? []).filter((c) => isShowedNotClosed(c.outcome));
  const noShows = (calls ?? []).filter((c) => isNoShow(c.outcome));
  const deposits = (calls ?? []).filter((c) => c.outcome === "deposit_only");
  const calls_shown = won.length + showedNotClosed.length;

  const revenueAmounts = await Promise.all(
    won.map(async (c) => {
      const currency = (c.clients as unknown as { currency: string } | null)?.currency ?? "USD";
      return toUSD(c.revenue ?? 0, currency);
    })
  );
  const revenue = revenueAmounts.reduce((s, v) => s + v, 0);

  const cashAmounts = await Promise.all(
    won.map(async (c) => {
      const currency = (c.clients as unknown as { currency: string } | null)?.currency ?? "USD";
      const cash = c.outcome === "split_pay" ? (c.cash_collected ?? 0) : (c.revenue ?? 0);
      return toUSD(cash, currency);
    })
  );
  const cash_collected = cashAmounts.reduce((s, v) => s + v, 0);

  const close_rate = calls_shown > 0 ? (won.length / calls_shown) * 100 : 0;
  const show_up_rate = (calls_shown + noShows.length) > 0
    ? (calls_shown / (calls_shown + noShows.length)) * 100
    : 0;
  const revenue_per_call = calls_shown > 0 ? revenue / calls_shown : 0;
  const cash_per_call = calls_shown > 0 ? cash_collected / calls_shown : 0;
  const cash_upfront_pct = revenue > 0 ? (cash_collected / revenue) * 100 : 0;
  const pif_count = won.filter((c) => isPif(c.outcome)).length;
  const pif_pct = won.length > 0 ? (pif_count / won.length) * 100 : 0;
  const avg_deal = won.length > 0 ? revenue / won.length : 0;
  const avg_cash = won.length > 0 ? cash_collected / won.length : 0;

  // Objection counters — spec: only Offer Declined + Not a Fit (not Deposit Only)
  const lostCalls = (calls ?? []).filter(
    (c) => c.outcome === "offer_declined" || c.outcome === "not_a_fit" || c.outcome === "lost"
  );
  const objections = { money: 0, time: 0, partner: 0, think_about_it: 0, fear: 0, value: 0, other: 0 };
  for (const c of lostCalls) {
    const obj = (c.objection ?? "").toLowerCase().replace(/\s+/g, "_");
    if (obj.includes("money") || obj.includes("price") || obj.includes("cost")) objections.money++;
    else if (obj.includes("time") || obj.includes("timing") || obj.includes("busy")) objections.time++;
    else if (obj.includes("partner") || obj.includes("spouse") || obj.includes("husband") || obj.includes("wife")) objections.partner++;
    else if (obj.includes("think") || obj.includes("consider") || obj.includes("decide")) objections.think_about_it++;
    else if (obj.includes("fear") || obj.includes("scared") || obj.includes("risk")) objections.fear++;
    else if (obj.includes("value") || obj.includes("worth") || obj.includes("benefit")) objections.value++;
    else if (c.objection) objections.other++;
  }

  return {
    revenue,
    cash_collected,
    deals_won: won.length,
    deals_lost: showedNotClosed.length,
    close_rate,
    show_up_rate,
    deposits: deposits.length,
    // Spec: estimated pipeline value = average deal size × number of deposits
    deposit_value: avg_deal * deposits.length,
    revenue_per_call,
    cash_per_call,
    cash_upfront_pct,
    pif_pct,
    avg_deal,
    avg_cash,
    calls_taken: (calls ?? []).filter((c) => !isRescheduled(c.outcome)).length,
    calls_shown,
    no_shows: noShows.length,
    objections,
  };
}

export async function logCall(payload: {
  client_id?: string | null;
  closer_id: string;
  lead_name: string;
  lead_source: string;
  outcome: string;
  revenue: number;
  cash_collected?: number;
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
    .select("*, clients(currency)")
    .order("spend", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);

  const { data } = await query;
  if (!data) return [];

  // Convert money fields from the ad account's billing currency (taken from the
  // owning client) to USD at view time, per spec. Non-money fields are untouched.
  return Promise.all(
    data.map(async (row) => {
      const { clients, ...c } = row as AdCampaign & { clients?: { currency: string } | null };
      const currency = clients?.currency ?? "USD";
      return {
        ...(c as AdCampaign),
        spend: await toUSD(c.spend ?? 0, currency),
        cpm: await toUSD(c.cpm ?? 0, currency),
        cpc: await toUSD(c.cpc ?? 0, currency),
        cost_per_result: await toUSD(c.cost_per_result ?? 0, currency),
      } as AdCampaign;
    })
  );
}

export async function getAdsKpis(clientId?: string): Promise<AdsKpis> {
  const supabase = await createClient();
  const campaigns = await getAdCampaigns(clientId);
  const ms = monthStart();

  // Exclude archived campaigns from spend metrics
  const billable = campaigns.filter((c) => c.status !== "archived");

  // Month-to-date ad spend (stored in USD by the sync) — period-consistent with
  // the revenue window below and already currency-converted.
  let spendQuery = supabase.from("daily_metrics").select("ad_spend").gte("metric_date", ms);
  if (clientId) spendQuery = spendQuery.eq("client_id", clientId);
  const { data: adDays } = await spendQuery;
  const total_spend = (adDays ?? []).reduce((s, d) => s + (d.ad_spend ?? 0), 0);

  const total_impressions = billable.reduce((s, c) => s + c.impressions, 0);
  const total_followers = billable.reduce((s, c) => s + (c.followers ?? 0), 0);

  // Results with fallback: if results=0 but cost_per_result>0, derive from spend/cpr
  const total_results = billable.reduce((s, c) => {
    if (c.results > 0) return s + c.results;
    if (c.cost_per_result > 0) return s + Math.round(c.spend / c.cost_per_result);
    return s;
  }, 0);

  // Impression-weighted CTR and CPC
  const avg_ctr = total_impressions > 0
    ? billable.reduce((s, c) => s + (c.ctr * c.impressions), 0) / total_impressions
    : 0;

  // CPM = spend / impressions * 1000
  const cpm = total_impressions > 0 ? (total_spend / total_impressions) * 1000 : 0;

  // CPC: impression-weighted from per-campaign cpc
  const cpc = total_impressions > 0
    ? billable.reduce((s, c) => s + ((c.cpc ?? 0) * c.impressions), 0) / total_impressions
    : 0;

  // Revenue and cash from calls this month (for ROAS Rev / ROAS Cash)
  const wonOutcomesStr = ["closed", "paid_in_full", "split_pay"];
  const [{ data: wonCalls }, { data: allCalls }, { data: setterLogs }] = await Promise.all([
    supabase
      .from("calls")
      .select("outcome, revenue, cash_collected, clients(currency)")
      .gte("call_date", ms)
      .in("outcome", wonOutcomesStr),
    supabase.from("calls").select("outcome").gte("call_date", ms),
    supabase.from("setter_logs").select("conversations").gte("log_date", ms),
  ]);

  const revenueAmounts = await Promise.all(
    (wonCalls ?? []).map(async (c) => {
      const currency = (c.clients as unknown as { currency: string } | null)?.currency ?? "USD";
      return toUSD(c.revenue ?? 0, currency);
    })
  );
  const total_revenue = revenueAmounts.reduce((s, v) => s + v, 0);

  const cashAmounts = await Promise.all(
    (wonCalls ?? []).map(async (c) => {
      const currency = (c.clients as unknown as { currency: string } | null)?.currency ?? "USD";
      const cash = c.outcome === "split_pay" ? (c.cash_collected ?? 0) : (c.revenue ?? 0);
      return toUSD(cash, currency);
    })
  );
  const total_cash = cashAmounts.reduce((s, v) => s + v, 0);

  const roas_rev = total_spend > 0 ? total_revenue / total_spend : 0;
  const roas_cash = total_spend > 0 ? total_cash / total_spend : 0;

  const calls_taken = (allCalls ?? []).filter((c) => c.outcome !== "rescheduled").length;
  const cost_per_call = calls_taken > 0 ? total_spend / calls_taken : 0;

  const deals_won = (wonCalls ?? []).length;
  const cost_per_customer = deals_won > 0 ? total_spend / deals_won : 0;

  const total_conversations = (setterLogs ?? []).reduce((s, l) => s + (l.conversations ?? 0), 0);
  const cost_per_convo = total_conversations > 0 ? total_spend / total_conversations : 0;

  // Spec defines this as spend ÷ followers *gained* (end − start of period). No
  // follower snapshots are collected yet, so we fall back to the stored follower
  // total; the card shows "—" whenever that is zero.
  const cost_per_follower = total_followers > 0 ? total_spend / total_followers : 0;
  const cost_per_result = total_results > 0 ? total_spend / total_results : 0;

  return {
    total_spend,
    total_impressions,
    total_results,
    total_followers,
    avg_ctr,
    cpm,
    cpc,
    roas_rev,
    roas_cash,
    cost_per_call,
    cost_per_customer,
    cost_per_convo,
    cost_per_follower,
    cost_per_result,
  };
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
    closer_name: (row.profiles as { full_name: string } | null)?.full_name ?? "—",
  }));

  return { calls: calls as (Call & { closer_name: string })[], total: count ?? 0 };
}

export async function getCallOutcomeDistribution() {
  const supabase = await createClient();
  const { data } = await supabase.from("calls").select("outcome");
  if (!data?.length) return [];

  const counts = { won: 0, rescheduled: 0, noshow: 0, lost: 0 };
  for (const c of data) {
    if (isWon(c.outcome)) counts.won++;
    else if (isRescheduled(c.outcome)) counts.rescheduled++;
    else if (isNoShow(c.outcome)) counts.noshow++;
    else if (isShowedNotClosed(c.outcome)) counts.lost++;
  }
  return [
    { name: "Closed",      value: counts.won,         color: "#10B981" },
    { name: "Rescheduled", value: counts.rescheduled,  color: "#adc6ff" },
    { name: "No-Show",     value: counts.noshow,       color: "#F59E0B" },
    { name: "Lost/Disq",   value: counts.lost,         color: "#EF4444" },
  ];
}

// ─── Leaderboard ─────────────────────────────────────────────

export async function getFullLeaderboard() {
  const supabase = await createClient();
  const ms = monthStart();

  const { data: callData } = await supabase
    .from("calls")
    .select("closer_id, outcome, revenue, profiles!closer_id(full_name), clients(currency)")
    .gte("call_date", ms);

  const map = new Map<string, { full_name: string; revenue: number; calls: number; won: number; shown: number; noshow: number }>();
  for (const row of callData ?? []) {
    if (!row.closer_id) continue;
    const name = (row.profiles as unknown as { full_name: string } | null)?.full_name ?? "Unknown";
    const currency = (row.clients as unknown as { currency: string } | null)?.currency ?? "USD";
    const e = map.get(row.closer_id) ?? { full_name: name, revenue: 0, calls: 0, won: 0, shown: 0, noshow: 0 };
    if (!isRescheduled(row.outcome)) e.calls += 1;
    if (isWon(row.outcome)) { e.won += 1; e.revenue += await toUSD(row.revenue ?? 0, currency); }
    if (isWon(row.outcome) || isShowedNotClosed(row.outcome)) e.shown += 1;
    if (isNoShow(row.outcome)) e.noshow += 1;
    map.set(row.closer_id, e);
  }

  const closers = Array.from(map.entries())
    .map(([closer_id, v]) => ({
      closer_id, full_name: v.full_name, revenue: v.revenue, calls: v.calls,
      close_rate: v.shown > 0 ? (v.won / v.shown) * 100 : 0,
      show_up_rate: (v.shown + v.noshow) > 0 ? (v.shown / (v.shown + v.noshow)) * 100 : 0,
      trend_up: null as boolean | null,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const { data: setterData } = await supabase
    .from("setter_logs")
    .select("setter_id, calls_booked, conversations, profiles!setter_id(full_name)")
    .gte("log_date", ms);

  const setterMap = new Map<string, { full_name: string; calls_booked: number; conversations: number }>();
  for (const row of setterData ?? []) {
    if (!row.setter_id) continue;
    const name = (row.profiles as unknown as { full_name: string } | null)?.full_name ?? "Unknown";
    const e = setterMap.get(row.setter_id) ?? { full_name: name, calls_booked: 0, conversations: 0 };
    e.calls_booked += row.calls_booked ?? 0;
    e.conversations += row.conversations ?? 0;
    setterMap.set(row.setter_id, e);
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
    .limit(60);

  if (setterId) query = query.eq("setter_id", setterId);

  const { data } = await query;
  return (data as SetterLog[]) ?? [];
}

export async function getSetterPeriodKpis(setterId?: string): Promise<SetterPeriodKpis> {
  const supabase = await createClient();
  const ms = monthStart();

  let query = supabase
    .from("setter_logs")
    .select("conversations, replies, proposals, calls_booked, follow_ups")
    .gte("log_date", ms);

  if (setterId) query = query.eq("setter_id", setterId);

  const { data: logs } = await query;

  const conversations = (logs ?? []).reduce((s, l) => s + (l.conversations ?? 0), 0);
  const responses = (logs ?? []).reduce((s, l) => s + (l.replies ?? 0), 0);
  const proposals = (logs ?? []).reduce((s, l) => s + (l.proposals ?? 0), 0);
  const calls_booked = (logs ?? []).reduce((s, l) => s + (l.calls_booked ?? 0), 0);
  const follow_ups = (logs ?? []).reduce((s, l) => s + (l.follow_ups ?? 0), 0);

  const lead_response_pct = conversations > 0 ? (responses / conversations) * 100 : 0;
  const proposal_response_pct = responses > 0 ? (proposals / responses) * 100 : 0;
  const call_proposal_pct = proposals > 0 ? (calls_booked / proposals) * 100 : 0;
  const call_lead_pct = conversations > 0 ? (calls_booked / conversations) * 100 : 0;

  const dayElapsed = currentDayOfMonth();
  const pacing = dayElapsed > 0 ? (calls_booked / dayElapsed) * daysInCurrentMonth() : 0;

  return {
    conversations,
    responses,
    proposals,
    calls_booked,
    follow_ups,
    pacing,
    lead_response_pct,
    proposal_response_pct,
    call_proposal_pct,
    call_lead_pct,
  };
}

export async function getSetterAttribution(): Promise<SetterAttribution[]> {
  const supabase = await createClient();
  const ms = monthStart();

  const { data: calls } = await supabase
    .from("calls")
    .select("booked_by_setter_id, outcome, revenue, profiles!booked_by_setter_id(full_name), clients(currency)")
    .gte("call_date", ms)
    .not("booked_by_setter_id", "is", null);

  if (!calls?.length) return [];

  const map = new Map<string, { full_name: string; calls_set: number; deals_closed: number; revenue: number }>();
  for (const row of calls) {
    if (!row.booked_by_setter_id) continue;
    const name = (row.profiles as unknown as { full_name: string } | null)?.full_name ?? "Unknown";
    const currency = (row.clients as unknown as { currency: string } | null)?.currency ?? "USD";
    const e = map.get(row.booked_by_setter_id) ?? { full_name: name, calls_set: 0, deals_closed: 0, revenue: 0 };
    if (!isRescheduled(row.outcome)) e.calls_set += 1;
    if (isWon(row.outcome)) { e.deals_closed += 1; e.revenue += await toUSD(row.revenue ?? 0, currency); }
    map.set(row.booked_by_setter_id, e);
  }

  return Array.from(map.entries()).map(([setter_id, v]) => ({
    setter_id,
    full_name: v.full_name,
    calls_set: v.calls_set,
    deals_closed: v.deals_closed,
    revenue: v.revenue,
    set_close_rate: v.calls_set > 0 ? (v.deals_closed / v.calls_set) * 100 : 0,
  }));
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
    closer_name: (row.profiles as { full_name: string } | null)?.full_name ?? "—",
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
