import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSlackMessage } from "@/lib/slack";

interface DayMetrics {
  revenue: number;
  calls_completed: number;
  deals_closed: number;
  ad_spend: number;
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const since28 = new Date();
    since28.setDate(since28.getDate() - 28);

    const { data } = await supabase
      .from("daily_metrics")
      .select("metric_date, revenue, calls_completed, deals_closed, ad_spend")
      .gte("metric_date", since28.toISOString().split("T")[0])
      .order("metric_date", { ascending: false });

    if (!data || data.length < 7) {
      return NextResponse.json({ ok: true, message: "Not enough data for anomaly check." });
    }

    // Last 2 days vs prior 26-day baseline
    const recent = data.slice(0, 2) as DayMetrics[];
    const baseline = data.slice(2) as DayMetrics[];

    const metrics: Array<{ name: string; recent: number; baseline: number }> = [
      {
        name: "Daily Revenue",
        recent: avg(recent.map((d) => d.revenue)),
        baseline: avg(baseline.map((d) => d.revenue)),
      },
      {
        name: "Close Rate",
        recent: avg(recent.map((d) => d.calls_completed > 0 ? (d.deals_closed / d.calls_completed) * 100 : 0)),
        baseline: avg(baseline.map((d) => d.calls_completed > 0 ? (d.deals_closed / d.calls_completed) * 100 : 0)),
      },
      {
        name: "Ad Spend Efficiency",
        recent: avg(recent.map((d) => d.ad_spend > 0 ? d.revenue / d.ad_spend : 0)),
        baseline: avg(baseline.map((d) => d.ad_spend > 0 ? d.revenue / d.ad_spend : 0)),
      },
    ];

    const alerts: string[] = [];

    for (const m of metrics) {
      if (m.baseline === 0) continue;
      const dropPct = ((m.baseline - m.recent) / m.baseline) * 100;
      if (dropPct >= 35) {
        alerts.push(`🚨 *CRITICAL* — ${m.name} dropped *${dropPct.toFixed(0)}%* vs 28-day avg (${ m.baseline.toFixed(1)} → ${m.recent.toFixed(1)})`);
      } else if (dropPct >= 20) {
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

    return NextResponse.json({
      ok: true,
      checked: metrics.length,
      alertsFired: alerts.length,
      alerts,
    });
  } catch (err) {
    console.error("Anomaly check error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
