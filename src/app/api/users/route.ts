import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Only admins may manage users.
async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin";
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, role, active, client_id")
    .order("full_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}

// Invite a new team member by email and set their role.
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { email, full_name, role } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const admin = await createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const uid = data.user?.id;
  if (uid) {
    await admin.from("profiles").upsert({
      id: uid,
      full_name: full_name || email.split("@")[0],
      role: role || "closer",
      active: true,
    });
  }
  return NextResponse.json({ ok: true });
}

// Update a user's role or active status.
export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, role, active } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (role !== undefined) patch.role = role;
  if (active !== undefined) patch.active = active;

  const admin = await createAdminClient();
  const { error } = await admin.from("profiles").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
