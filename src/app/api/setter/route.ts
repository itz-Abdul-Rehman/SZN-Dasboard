import { NextResponse } from "next/server";
import { getSetterLogs, logSetterDay, getCurrentProfile } from "@/lib/db/queries";

export async function GET() {
  const profile = await getCurrentProfile();
  const setterId = profile?.role === "setter" ? profile.id : undefined;
  const logs = await getSetterLogs(setterId);
  return NextResponse.json({ logs });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const today = new Date().toISOString().split("T")[0];

  await logSetterDay({
    setter_id:     profile.id,
    log_date:      today,
    conversations: Number(body.conversations ?? 0),
    replies:       Number(body.replies       ?? 0),
    proposals:     Number(body.proposals     ?? 0),
    calls_booked:  Number(body.calls_booked  ?? 0),
    follow_ups:    Number(body.follow_ups    ?? 0),
  });

  return NextResponse.json({ ok: true });
}
