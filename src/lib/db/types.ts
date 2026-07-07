export type Role = "admin" | "closer" | "setter" | "client";

export type CallOutcome =
  // Granular (new)
  | "paid_in_full" | "split_pay"
  | "offer_declined" | "not_a_fit" | "deposit_only"
  | "no_show" | "cancelled"
  | "rescheduled"
  // Legacy (backward compat with existing rows)
  | "closed" | "lost" | "noshow";

// Outcome group helpers used in queries and UI
export const WON_OUTCOMES: CallOutcome[] = ["closed", "paid_in_full", "split_pay"];
export const SHOWED_NOT_CLOSED: CallOutcome[] = ["lost", "offer_declined", "not_a_fit", "deposit_only"];
export const NOSHOW_OUTCOMES: CallOutcome[] = ["noshow", "no_show", "cancelled"];

export type CampaignStatus = "active" | "paused" | "archived";
export type LeadSource = "Facebook" | "Organic" | "Referral" | "Cold Outreach" | "Instagram" | "YouTube";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  client_id: string | null;
  avatar_initials: string | null;
  active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  currency: string;
  revenue_goal: number;
  calls_goal: number;
  active: boolean;
  created_at: string;
}

export interface Call {
  id: string;
  client_id: string | null;
  closer_id: string | null;
  booked_by_setter_id: string | null;
  lead_name: string;
  lead_source: LeadSource;
  outcome: CallOutcome;
  revenue: number;
  cash_collected: number;
  notes: string | null;
  objection: string | null;
  tag: string | null;
  call_date: string;
  call_time: string;
  created_at: string;
  closer?: Pick<Profile, "full_name">;
}

export interface AdCampaign {
  id: string;
  client_id: string | null;
  name: string;
  category: string;
  status: CampaignStatus;
  spend: number;
  impressions: number;
  reach: number;
  results: number;
  followers: number;
  ctr: number;
  cpm: number;
  cpc: number;
  cost_per_result: number;
  roas: number;
  flagged: boolean;
  flag_reason: string | null;
  meta_campaign_id: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export interface DailyMetric {
  id: string;
  client_id: string;
  metric_date: string;
  revenue: number;
  calls_booked: number;
  calls_completed: number;
  deals_closed: number;
  ad_spend: number;
}

export interface SetterLog {
  id: string;
  setter_id: string | null;
  log_date: string;
  conversations: number;
  replies: number;
  proposals: number;
  calls_booked: number;
  follow_ups: number;
  created_at: string;
  setter?: Pick<Profile, "full_name">;
}

// ─── Aggregated KPI shapes ────────────────────────────────────

export interface MasterKpis {
  total_revenue: number;
  cash_collected: number;
  calls_taken: number;
  booked_calls: number;
  deals_won: number;
  close_rate: number;
  show_up_rate: number;
  no_shows: number;
  avg_deal_size: number;
  roas: number;
  ad_spend: number;
  pacing: number;
}

export interface SalesKpis {
  revenue: number;
  cash_collected: number;
  deals_won: number;
  deals_lost: number;
  close_rate: number;
  show_up_rate: number;
  deposits: number;
  deposit_value: number;
  revenue_per_call: number;
  cash_per_call: number;
  cash_upfront_pct: number;
  pif_pct: number;
  avg_deal: number;
  avg_cash: number;
  calls_taken: number;
  calls_shown: number;
  no_shows: number;
  objections: {
    money: number;
    time: number;
    partner: number;
    think_about_it: number;
    fear: number;
    value: number;
    other: number;
  };
}

export interface AdsKpis {
  total_spend: number;
  total_impressions: number;
  total_results: number;
  total_followers: number;
  avg_ctr: number;
  cpm: number;
  cpc: number;
  roas_rev: number;
  roas_cash: number;
  cost_per_call: number;
  cost_per_customer: number;
  cost_per_convo: number;
  cost_per_follower: number;
  cost_per_result: number;
}

export interface SetterPeriodKpis {
  conversations: number;
  responses: number;
  proposals: number;
  calls_booked: number;
  follow_ups: number;
  pacing: number;
  lead_response_pct: number;
  proposal_response_pct: number;
  call_proposal_pct: number;
  call_lead_pct: number;
}

export interface SetterAttribution {
  setter_id: string;
  full_name: string;
  calls_set: number;
  deals_closed: number;
  revenue: number;
  set_close_rate: number;
}

export interface CloserLeaderboardRow {
  closer_id: string;
  full_name: string;
  revenue: number;
  calls: number;
  close_rate: number;
  show_up_rate: number;
  trend_up: boolean | null;
}

export interface ClientGoalProgress {
  client_id: string;
  name: string;
  rev_current: number;
  rev_goal: number;
  calls_current: number;
  calls_goal: number;
}
