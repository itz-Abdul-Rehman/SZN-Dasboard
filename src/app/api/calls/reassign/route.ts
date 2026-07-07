import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Admins can reassign a logged call to a different closer.
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { callId, closerId } = await req.json();
  if (!callId || !closerId) return NextResponse.json({ error: "callId and closerId required" }, { status: 400 });

  const admin = await createAdminClient();
  const { error } = await admin.from("calls").update({ closer_id: closerId }).eq("id", callId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
