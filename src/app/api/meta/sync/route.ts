import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  fetchMetaCampaigns,
  fetchAccountDailySpend,
  normalizeStatus,
  extractResults,
  extractCostPerResult,
} from "@/lib/meta";
import { toUSD } from "@/lib/exchange-rate";

export async function POST() {
  try {
    const campaigns = await fetchMetaCampaigns();

    if (campaigns.length === 0) {
      return NextResponse.json({ ok: true, synced: 0, message: "No campaigns found in Meta account." });
    }

    const supabase = await createAdminClient();

    // Get first client as default (campaigns synced from Meta belong to the primary client)
    const { data: clients } = await supabase
      .from("clients")
      .select("id, currency")
      .eq("active", true)
      .limit(1);
    const clientId = clients?.[0]?.id ?? null;
    const clientCurrency = clients?.[0]?.currency ?? "USD";

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
        last_synced_at: new Date().toISOString(),
      };

      // Manual upsert keyed on the stable Meta campaign id. The table has no
      // unique constraint on meta_campaign_id/name, so onConflict upsert fails —
      // check for an existing row and update it, otherwise insert.
      const { data: existing } = await supabase
        .from("ad_campaigns")
        .select("id")
        .eq("meta_campaign_id", c.id)
        .maybeSingle();

      const { error } = existing
        ? await supabase.from("ad_campaigns").update(row).eq("id", existing.id)
        : await supabase.from("ad_campaigns").insert(row);

      if (error) errors.push(`${c.name}: ${error.message}`);
      else synced++;
    }

    // Record 90 days of per-day ad spend (converted to USD) into daily_metrics
    // (feeds the spend chart) and ad_metrics_history (90-day archive per spec).
    // Non-fatal if it fails.
    let dailyPoints = 0;
    if (clientId) {
      try {
        const daily = await fetchAccountDailySpend("last_90d");
        for (const d of daily) {
          const spendUsd = await toUSD(d.spend, clientCurrency);

          const { data: ex } = await supabase
            .from("daily_metrics")
            .select("id")
            .eq("client_id", clientId)
            .eq("metric_date", d.date)
            .maybeSingle();
          const { error: dErr } = ex
            ? await supabase.from("daily_metrics").update({ ad_spend: spendUsd }).eq("id", ex.id)
            : await supabase.from("daily_metrics").insert({ client_id: clientId, metric_date: d.date, ad_spend: spendUsd });
          if (!dErr) dailyPoints++;

          // 90-day ad history archive (account-level daily snapshot).
          const { data: hx } = await supabase
            .from("ad_metrics_history")
            .select("id")
            .is("campaign_id", null)
            .eq("metric_date", d.date)
            .maybeSingle();
          if (hx) {
            await supabase.from("ad_metrics_history").update({ spend: spendUsd, impressions: d.impressions }).eq("id", hx.id);
          } else {
            await supabase.from("ad_metrics_history").insert({ campaign_id: null, metric_date: d.date, spend: spendUsd, impressions: d.impressions });
          }
        }
      } catch (e) {
        errors.push(`daily spend: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({
      ok: true,
      synced,
      total: campaigns.length,
      dailyPoints,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// GET handler for Vercel cron
export { POST as GET };
