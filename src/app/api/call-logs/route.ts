import { NextResponse } from "next/server";
import { getCallLogs } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page    = parseInt(searchParams.get("page")    ?? "1", 10);
  const perPage = parseInt(searchParams.get("perPage") ?? "8",  10);
  const search  = searchParams.get("search")  ?? "";
  const outcome = searchParams.get("outcome") ?? "all";
  const preset  = searchParams.get("preset")  ?? "thismonth";

  const result = await getCallLogs({ page, perPage, search: search || undefined, outcome, preset });
  return NextResponse.json(result);
}

// Delete a call log. RLS allows admins (and closers on their own calls).
export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("calls").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Edit a call log (whitelisted fields only).
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const allowed = ["lead_name", "lead_source", "outcome", "revenue", "cash_collected", "notes", "objection", "tag"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "no fields to update" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("calls").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
