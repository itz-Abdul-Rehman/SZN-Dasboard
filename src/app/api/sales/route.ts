import { NextRequest, NextResponse } from "next/server";
import { getTodaysCalls, getSalesKpis, logCall } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { toUSD } from "@/lib/exchange-rate";
import { sendSlackMessage, buildBigDealMessage } from "@/lib/slack";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { SalesKpis } from "@/lib/db/types";

const WON_OUTCOMES = ["closed", "paid_in_full", "split_pay"];
const BIG_DEAL_USD = 5000;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const closerId = req.nextUrl.searchParams.get("closer_id") ?? user?.id;

  const [calls, kpis] = await Promise.all([
    getTodaysCalls(closerId ?? undefined),
    getSalesKpis(closerId ?? undefined),
  ]);

  return NextResponse.json({ calls, kpis });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  try {
    await logCall({
      client_id: body.client_id,
      closer_id: user.id,
      lead_name: body.lead_name,
      lead_source: body.lead_source,
      outcome: body.outcome,
      revenue: body.revenue ?? 0,
      cash_collected: body.cash_collected ?? 0,
      notes: body.notes,
      objection: body.objection,
    });

    // Big-deal celebration → Slack (fire-and-forget)
    if (WON_OUTCOMES.includes(body.outcome) && (body.revenue ?? 0) > 0) {
      (async () => {
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        let currency = "USD";
        if (body.client_id) {
          const { data: cl } = await supabase.from("clients").select("currency").eq("id", body.client_id).maybeSingle();
          currency = cl?.currency ?? "USD";
        }
        const amountUsd = await toUSD(body.revenue ?? 0, currency);
        if (amountUsd >= BIG_DEAL_USD) {
          await sendSlackMessage(buildBigDealMessage({
            closerName: prof?.full_name ?? "A closer",
            leadName: body.lead_name ?? "a lead",
            amountUsd,
          }));
        }
      })().catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
