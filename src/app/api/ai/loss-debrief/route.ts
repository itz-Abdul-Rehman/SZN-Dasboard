import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { sendSlackMessage, buildLossDebriefMessage } from "@/lib/slack";
import { getAiToneInstruction } from "@/lib/db/queries";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { leadName, leadSource, objection, notes, closerName } = await req.json();
    const tone = await getAiToneInstruction();

    const callDetails = [
      `Lead: ${leadName ?? "Unknown"}`,
      `Source: ${leadSource ?? "Unknown"}`,
      closerName && closerName !== "—" ? `Closer: ${closerName}` : null,
      objection ? `Objection raised: ${objection}` : null,
      notes ? `Call notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are a sales coach for a high-ticket coaching agency. A call was lost. Given the details, produce a debrief with exactly 3 short sections: **What went wrong**, **Key objection**, **How to improve**. Be direct and specific. No preamble. ${tone}`,
        },
        { role: "user", content: callDetails },
      ],
      stream: true,
      max_tokens: 250,
      temperature: 0.4,
    });

    const encoder = new TextEncoder();
    let fullDebrief = "";

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            fullDebrief += text;
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();

        // Fire-and-forget Slack notification after stream completes
        sendSlackMessage(
          buildLossDebriefMessage({
            leadName: leadName ?? "Unknown",
            leadSource: leadSource ?? "Unknown",
            closerName: closerName && closerName !== "—" ? closerName : "Unassigned",
            debrief: fullDebrief,
          })
        ).catch(console.error);
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Loss debrief error:", err);
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
