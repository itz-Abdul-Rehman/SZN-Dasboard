import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getMasterKpis, getClientGoalProgress, getAiToneInstruction } from "@/lib/db/queries";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode: "insights" | "next-action" = body.mode ?? "insights";

    const [kpis, clientGoals, tone] = await Promise.all([
      getMasterKpis(),
      getClientGoalProgress(),
      getAiToneInstruction(),
    ]);

    const kpiSummary = `
Total Revenue: $${kpis.total_revenue.toLocaleString()}
Cash Collected: $${kpis.cash_collected.toLocaleString()}
Deals Won: ${kpis.deals_won}
Calls Taken: ${kpis.calls_taken}
Booked Calls: ${kpis.booked_calls}
Close Rate: ${kpis.close_rate.toFixed(1)}%
Show-Up Rate: ${kpis.show_up_rate.toFixed(1)}%
Avg Deal Size: $${kpis.avg_deal_size.toLocaleString()}
No-Shows: ${kpis.no_shows}
ROAS: ${kpis.roas.toFixed(2)}x
Ad Spend: $${kpis.ad_spend.toLocaleString()}
Pacing: $${kpis.pacing.toLocaleString()}
`.trim();

    const goalsSummary = clientGoals
      .map((g) => {
        const revPct = g.rev_goal > 0 ? ((g.rev_current / g.rev_goal) * 100).toFixed(0) : "0";
        const callsPct = g.calls_goal > 0 ? ((g.calls_current / g.calls_goal) * 100).toFixed(0) : "0";
        return `${g.name}: Revenue ${revPct}% of goal ($${g.rev_current.toLocaleString()}/$${g.rev_goal.toLocaleString()}), Calls ${callsPct}% of goal (${g.calls_current}/${g.calls_goal})`;
      })
      .join("\n");

    const systemPrompt =
      (mode === "insights"
        ? `You are a sharp performance analyst for a marketing agency. Given the KPI data below, generate exactly 4-6 concise bullet observations. Each bullet must start with a bold label like **Revenue**, **Close Rate**, etc. Be specific with numbers. No fluff, no preamble, no conclusion. Just the bullets.`
        : `You are a strategic advisor for a marketing agency. Given the KPI data below, generate exactly 3 concrete next best actions the agency should take this week. Each action must start with a bold label. Be specific and actionable. No preamble or conclusion.`) +
      ` ${tone}`;

    const userPrompt = `KPIs:\n${kpiSummary}\n\nClient Goals:\n${goalsSummary}`;

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      max_tokens: 400,
      temperature: 0.5,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("AI insights error:", err);
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
