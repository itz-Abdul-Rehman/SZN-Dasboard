import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Agency-wide settings live in a single row keyed on a null client_id.
const DEFAULTS = { ai_personality: "Coach", close_rate_threshold: 20, rpc_drop_threshold: 30 };

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("ai_personality, close_rate_threshold, rpc_drop_threshold")
    .is("client_id", null)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: { ...DEFAULTS, ...(data ?? {}) } });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.ai_personality !== undefined) patch.ai_personality = body.ai_personality;
  if (body.close_rate_threshold !== undefined) patch.close_rate_threshold = Number(body.close_rate_threshold);
  if (body.rpc_drop_threshold !== undefined) patch.rpc_drop_threshold = Number(body.rpc_drop_threshold);

  const supabase = await createClient();

  // Manual upsert on the single agency-wide row (client_id is null → can't use onConflict).
  const { data: existing } = await supabase
    .from("settings")
    .select("id")
    .is("client_id", null)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("settings").update(patch).eq("id", existing.id)
    : await supabase.from("settings").insert({ client_id: null, ...patch });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
