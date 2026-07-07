import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendSlackMessage } from "@/lib/slack";
import { toUSD } from "@/lib/exchange-rate";
import { assertCron } from "@/lib/cron-auth";

const WON = ["closed", "paid_in_full", "split_pay"];

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  try {
    // Admin client: cron runs with no user session, so RLS would otherwise
    // return nothing.
    const supabase = await createAdminClient();

    const since = new Date();
    since.setDate(since.getDate() - 28);
    const sinceStr = since.toISOString().split("T")[0];

    const [{ data: calls }, { data: adDays }, { data: settings }] = await Promise.all([
      supabase.from("calls").select("call_date, outcome, revenue, clients(currency)").gte("call_date", sinceStr),
      supabase.from("daily_metrics").select("metric_date, ad_spend").gte("metric_date", sinceStr),
      supabase.from("settings").select("close_rate_threshold").is("client_id", null).maybeSingle(),
    ]);

    // Aggregate real activity per day (revenue in USD, completed calls, wins, spend).
    const byDay = new Map<string, { revenue: number; completed: number; won: number; ad_spend: number }>();
    const bucket = (d: string) => {
      let e = byDay.get(d);
      if (!e) { e = { revenue: 0, completed: 0, won: 0, ad_spend: 0 }; byDay.set(d, e); }
      return e;
    };
    for (const c of calls ?? []) {
      const e = bucket(c.call_date);
      if (c.outcome !== "rescheduled") e.completed++;
      if (WON.includes(c.outcome)) {
        e.won++;
        const cur = (c.clients as unknown as { currency: string } | null)?.currency ?? "USD";
        e.revenue += await toUSD(c.revenue ?? 0, cur);
      }
    }
    for (const d of adDays ?? []) bucket(d.metric_date).ad_spend += d.ad_spend ?? 0;

    // Continuous 28-day series (missing days count as zero activity).
    const series: { revenue: number; completed: number; won: number; ad_spend: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().split("T")[0];
      series.push(byDay.get(key) ?? { revenue: 0, completed: 0, won: 0, ad_spend: 0 });
    }

    const recent = series.slice(-2);      // last 2 days
    const baseline = series.slice(0, -2);  // prior 26 days

    const metrics: Array<{ name: string; recent: number; baseline: number }> = [
      { name: "Daily Revenue", recent: avg(recent.map((d) => d.revenue)), baseline: avg(baseline.map((d) => d.revenue)) },
      {
        name: "Close Rate",
        recent: avg(recent.map((d) => (d.completed > 0 ? (d.won / d.completed) * 100 : 0))),
        baseline: avg(baseline.map((d) => (d.completed > 0 ? (d.won / d.completed) * 100 : 0))),
      },
      {
        name: "Ad Spend Efficiency (ROAS)",
        recent: avg(recent.map((d) => (d.ad_spend > 0 ? d.revenue / d.ad_spend : 0))),
        baseline: avg(baseline.map((d) => (d.ad_spend > 0 ? d.revenue / d.ad_spend : 0))),
      },
    ];

    // Warning drop % is configurable in Settings; critical is fixed at 35%.
    const warnPct = Number(settings?.close_rate_threshold ?? 20);
    const critPct = 35;

    const alerts: string[] = [];
    for (const m of metrics) {
      if (m.baseline === 0) continue;
      const dropPct = ((m.baseline - m.recent) / m.baseline) * 100;
      if (dropPct >= critPct) {
        alerts.push(`🚨 *CRITICAL* — ${m.name} dropped *${dropPct.toFixed(0)}%* vs 28-day avg (${m.baseline.toFixed(1)} → ${m.recent.toFixed(1)})`);
      } else if (dropPct >= warnPct) {
        alerts.push(`⚠️ *WARNING* — ${m.name} dropped *${dropPct.toFixed(0)}%* vs 28-day avg (${m.baseline.toFixed(1)} → ${m.recent.toFixed(1)})`);
      }
    }

    if (alerts.length > 0) {
      await sendSlackMessage(
        `*SZN Anomaly Alert — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}*\n\n` +
        alerts.join("\n") +
        `\n\n_Check the dashboard for details._`
      );
    }

    return NextResponse.json({ ok: true, checked: metrics.length, alertsFired: alerts.length, alerts });
  } catch (err) {
    console.error("Anomaly check error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
