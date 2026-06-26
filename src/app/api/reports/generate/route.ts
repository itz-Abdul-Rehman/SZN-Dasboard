import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";
import { getCallOutcomeDistribution } from "@/lib/db/queries";
import { toUSD } from "@/lib/exchange-rate";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    let body: { dateFrom?: string; dateTo?: string; reportTitle?: string } = {};
    try { body = await req.json(); } catch { /* no body */ }

    const { dateFrom, dateTo, reportTitle } = body;
    const supabase = await createClient();

    // ── KPIs filtered by date range ────────────────────────────
    let callsQuery = supabase.from("calls").select("outcome, revenue, clients(currency)");
    if (dateFrom) callsQuery = callsQuery.gte("call_date", dateFrom);
    if (dateTo)   callsQuery = callsQuery.lte("call_date", dateTo);
    const { data: calls } = await callsQuery;

    let adsQuery = supabase.from("ad_campaigns").select("spend, roas").eq("status", "active");
    const { data: ads } = await adsQuery;

    const closed = calls?.filter((c) => c.outcome === "closed") ?? [];
    const no_shows = calls?.filter((c) => c.outcome === "noshow").length ?? 0;

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
    const cash_collected = total_revenue * 0.82;

    const kpis = { total_revenue, cash_collected, calls_booked: calls?.length ?? 0, close_rate, avg_deal_size, no_shows, roas, ad_spend };

    // ── Client goal progress filtered by date range ─────────────
    const { data: clients } = await supabase.from("clients").select("id, name, currency, revenue_goal, calls_goal").eq("active", true);

    const periodStart = dateFrom ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const periodEnd   = dateTo   ?? new Date().toISOString().split("T")[0];

    let goalCallsQuery = supabase.from("calls").select("client_id, outcome, revenue").gte("call_date", periodStart).lte("call_date", periodEnd);
    const { data: goalCalls } = await goalCallsQuery;

    const clientGoals = await Promise.all(
      (clients ?? []).map(async (c) => {
        const clientCalls = goalCalls?.filter((ca) => ca.client_id === c.id) ?? [];
        const closedCalls = clientCalls.filter((ca) => ca.outcome === "closed");
        const revenueUSD = await Promise.all(closedCalls.map((ca) => toUSD(ca.revenue ?? 0, c.currency ?? "USD")));
        const rev_goal_usd = await toUSD(c.revenue_goal, c.currency ?? "USD");
        return {
          client_id: c.id,
          name: c.name,
          rev_current: revenueUSD.reduce((s, v) => s + v, 0),
          rev_goal: rev_goal_usd,
          calls_current: clientCalls.length,
          calls_goal: c.calls_goal,
        };
      })
    );

    // ── Outcomes (all-time for distribution context) ────────────
    const outcomes = await getCallOutcomeDistribution();

    // ── Date label for report title ─────────────────────────────
    const now = new Date();
    const dateLabel = reportTitle
      ? reportTitle
      : dateFrom && dateTo && dateFrom === dateTo
        ? new Date(dateFrom + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : dateFrom && dateTo
          ? `${new Date(dateFrom + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(dateTo + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
          : now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const kpiText = `
- Total Revenue: $${kpis.total_revenue.toLocaleString()}
- Cash Collected: $${kpis.cash_collected.toLocaleString()}
- Calls Booked: ${kpis.calls_booked}
- Close Rate: ${kpis.close_rate.toFixed(1)}%
- Avg Deal Size: $${kpis.avg_deal_size.toLocaleString()}
- No-Shows: ${kpis.no_shows}
- ROAS: ${kpis.roas.toFixed(2)}x
- Ad Spend: $${kpis.ad_spend.toLocaleString()}`.trim();

    const goalsText = clientGoals.map((g) => {
      const revPct = g.rev_goal > 0 ? ((g.rev_current / g.rev_goal) * 100).toFixed(0) : "0";
      const callsPct = g.calls_goal > 0 ? ((g.calls_current / g.calls_goal) * 100).toFixed(0) : "0";
      return `${g.name}: Revenue ${revPct}% of goal, Calls ${callsPct}% of goal`;
    }).join("\n");

    const outcomesText = outcomes.map((o) => `${o.name}: ${o.value}`).join(", ");
    const periodLabel = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : "current period";

    const { choices } = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a performance analyst writing a professional agency report. Write a structured report with these exact sections:
1. EXECUTIVE SUMMARY (2-3 sentences)
2. REVENUE PERFORMANCE (3-4 bullet points with specific numbers)
3. CALL & CONVERSION ANALYSIS (3-4 bullet points)
4. CLIENT GOAL PROGRESS (one line per client)
5. AD PERFORMANCE (2-3 sentences)
6. KEY RISKS (2-3 bullet points)
7. RECOMMENDATIONS (3 specific action items)

Use plain text. No markdown. Be specific with numbers.`,
        },
        {
          role: "user",
          content: `Report Period: ${periodLabel}\n\nKPIs:\n${kpiText}\n\nClient Goals:\n${goalsText}\n\nCall Outcomes: ${outcomesText}`,
        },
      ],
      max_tokens: 600,
      temperature: 0.4,
    });

    const narrative = choices[0]?.message?.content ?? "Report generation failed.";

    return NextResponse.json({
      ok: true,
      report: {
        title: `Performance Report — ${dateLabel}`,
        generatedAt: now.toISOString(),
        kpis,
        clientGoals,
        outcomes,
        narrative,
      },
    });
  } catch (err) {
    console.error("Report generation error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// GET handler for Vercel cron
export { POST as GET };
