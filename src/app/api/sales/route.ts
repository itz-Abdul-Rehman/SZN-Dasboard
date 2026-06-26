import { NextRequest, NextResponse } from "next/server";
import { getTodaysCalls, getSalesKpis, logCall } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";

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
      notes: body.notes,
      objection: body.objection,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
