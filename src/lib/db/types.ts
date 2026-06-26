export type Role = "admin" | "closer" | "setter" | "client";
export type CallOutcome = "closed" | "rescheduled" | "lost" | "noshow";
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
  lead_name: string;
  lead_source: LeadSource;
  outcome: CallOutcome;
  revenue: number;
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
  ctr: number;
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

// Aggregated shapes for dashboard pages
export interface MasterKpis {
  total_revenue: number;
  cash_collected: number;
  calls_booked: number;
  close_rate: number;
  avg_deal_size: number;
  no_shows: number;
  roas: number;
  ad_spend: number;
}

export interface CloserLeaderboardRow {
  closer_id: string;
  full_name: string;
  revenue: number;
  calls: number;
  close_rate: number;
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
