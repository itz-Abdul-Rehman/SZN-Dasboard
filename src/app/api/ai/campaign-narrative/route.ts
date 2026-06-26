import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getAdCampaigns, getAdsKpis } from "@/lib/db/queries";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const clientId: string | undefined = body.clientId;

    const [campaigns, kpis] = await Promise.all([
      getAdCampaigns(clientId),
      getAdsKpis(clientId),
    ]);

    const campaignList = campaigns
      .map(
        (c) =>
          `- ${c.name} (${c.status}): Spend $${c.spend.toLocaleString()}, ${c.impressions.toLocaleString()} impressions, ${c.results} results, CTR ${c.ctr.toFixed(1)}%, ROAS ${c.roas.toFixed(1)}x, Cost/Result $${c.cost_per_result.toFixed(2)}${c.flagged ? " ⚠️ flagged" : ""}`
      )
      .join("\n");

    const kpiSummary = `Total Spend: $${kpis.total_spend.toLocaleString()} | Total Results: ${kpis.total_results} | Avg ROAS: ${kpis.avg_roas.toFixed(1)}x | Avg CTR: ${kpis.avg_ctr.toFixed(2)}%`;

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a Meta Ads strategist. Given the campaign data, write a concise performance narrative in 3 short paragraphs: (1) Overall performance summary, (2) Top performers and why, (3) Recommendations to improve ROI. Be specific with numbers. No headers, just flowing prose.`,
        },
        {
          role: "user",
          content: `Overall KPIs:\n${kpiSummary}\n\nCampaigns:\n${campaignList}`,
        },
      ],
      stream: true,
      max_tokens: 350,
      temperature: 0.45,
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
    console.error("Campaign narrative error:", err);
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
