import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, currency, revenue_goal, calls_goal")
    .eq("active", true)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clients: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const { clientId, revenue_goal, calls_goal, currency } = await req.json();

  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ revenue_goal, calls_goal, currency })
    .eq("id", clientId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
