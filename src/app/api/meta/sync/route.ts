import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchMetaCampaigns,
  normalizeStatus,
  extractResults,
  extractCostPerResult,
} from "@/lib/meta";

export async function POST() {
  try {
    const campaigns = await fetchMetaCampaigns();

    if (campaigns.length === 0) {
      return NextResponse.json({ ok: true, synced: 0, message: "No campaigns found in Meta account." });
    }

    const supabase = await createClient();

    // Get first client_id as default (campaigns synced from Meta belong to the primary client)
    const { data: clients } = await supabase
      .from("clients")
      .select("id")
      .eq("active", true)
      .limit(1);
    const clientId = clients?.[0]?.id ?? null;

    let synced = 0;
    const errors: string[] = [];

    for (const c of campaigns) {
      const insight = c.insights?.data?.[0];
      const spend = Number(insight?.spend ?? 0);
      const impressions = Number(insight?.impressions ?? 0);
      const reach = Number(insight?.reach ?? 0);
      const ctr = Number(insight?.ctr ?? 0);
      const results = extractResults(c.insights);
      const costPerResult = extractCostPerResult(c.insights);
      const roas = spend > 0 && results > 0 ? (results * 1000) / spend : 0;

      const row = {
        client_id: clientId,
        name: c.name,
        category: c.objective ?? "Unknown",
        status: normalizeStatus(c.status),
        spend,
        impressions,
        reach,
        results,
        ctr,
        cost_per_result: costPerResult,
        roas,
        flagged: costPerResult > 200,
        meta_campaign_id: c.id,
      };

      // Upsert by meta_campaign_id if column exists, otherwise by name
      const { error } = await supabase
        .from("ad_campaigns")
        .upsert(row, { onConflict: "name" });

      if (error) errors.push(`${c.name}: ${error.message}`);
      else synced++;
    }

    return NextResponse.json({
      ok: true,
      synced,
      total: campaigns.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// GET handler for Vercel cron
export { POST as GET };
