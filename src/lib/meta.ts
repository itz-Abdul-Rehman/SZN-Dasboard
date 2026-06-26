const BASE = "https://graph.facebook.com/v19.0";
const TOKEN = process.env.META_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

export interface MetaCampaign {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  objective: string;
  insights?: {
    data: Array<{
      spend: string;
      impressions: string;
      reach: string;
      ctr: string;
      actions?: Array<{ action_type: string; value: string }>;
      cost_per_action_type?: Array<{ action_type: string; value: string }>;
    }>;
  };
}

export async function fetchMetaCampaigns(): Promise<MetaCampaign[]> {
  if (!TOKEN || !ACCOUNT_ID) throw new Error("Meta credentials not configured");

  const fields = [
    "name",
    "status",
    "objective",
    "insights.date_preset(last_30d){spend,impressions,reach,ctr,actions,cost_per_action_type}",
  ].join(",");

  const url = `${BASE}/act_${ACCOUNT_ID}/campaigns?fields=${encodeURIComponent(fields)}&access_token=${TOKEN}&limit=50`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) throw new Error(`Meta API: ${data.error.message}`);
  return (data.data as MetaCampaign[]) ?? [];
}

export function normalizeStatus(metaStatus: string): "active" | "paused" | "archived" {
  if (metaStatus === "ACTIVE") return "active";
  if (metaStatus === "PAUSED") return "paused";
  return "archived";
}

export function extractResults(actions?: MetaCampaign["insights"]): number {
  const data = actions?.data?.[0];
  if (!data?.actions) return 0;
  // Sum lead + purchase + contact actions as "results"
  const resultTypes = ["lead", "purchase", "onsite_conversion.lead_grouped", "contact_total"];
  return data.actions
    .filter((a) => resultTypes.some((t) => a.action_type.includes(t)))
    .reduce((sum, a) => sum + Number(a.value), 0);
}

export function extractCostPerResult(costActions?: MetaCampaign["insights"]): number {
  const data = costActions?.data?.[0];
  if (!data?.cost_per_action_type) return 0;
  const resultTypes = ["lead", "purchase", "onsite_conversion.lead_grouped", "contact_total"];
  const match = data.cost_per_action_type.find((a) =>
    resultTypes.some((t) => a.action_type.includes(t))
  );
  return match ? Number(match.value) : 0;
}
