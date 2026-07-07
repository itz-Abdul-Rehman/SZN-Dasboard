import { NextResponse } from "next/server";
import { getSetterLogs, getSetterPeriodKpis, getSetterAttribution, logSetterDay, getCurrentProfile } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { sendSlackMessage, buildStreakMilestoneMessage } from "@/lib/slack";

const STREAK_MILESTONES = [4, 7, 10];
function tierFor(days: number): string {
  return days >= 10 ? "LEGENDARY" : days >= 7 ? "ON FIRE" : days >= 4 ? "Hot" : days >= 2 ? "Warm" : "";
}

export async function GET() {
  const profile = await getCurrentProfile();
  const setterId = profile?.role === "setter" ? profile.id : undefined;
  const [logs, periodKpis, attribution] = await Promise.all([
    getSetterLogs(setterId),
    getSetterPeriodKpis(setterId),
    getSetterAttribution(),
  ]);
  return NextResponse.json({ logs, periodKpis, attribution });
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

  // Streak milestone → Slack when the setter crosses a tier boundary today.
  (async () => {
    const supabase = await createClient();
    const { data: logs } = await supabase
      .from("setter_logs")
      .select("log_date")
      .eq("setter_id", profile.id)
      .order("log_date", { ascending: false })
      .limit(60);
    const dates = new Set((logs ?? []).map((l) => l.log_date));
    let streak = 0;
    const d = new Date();
    while (dates.has(d.toISOString().split("T")[0])) { streak++; d.setDate(d.getDate() - 1); }
    if (STREAK_MILESTONES.includes(streak)) {
      await sendSlackMessage(buildStreakMilestoneMessage({ setterName: profile.full_name, days: streak, tier: tierFor(streak) }));
    }
  })().catch(() => {});

  return NextResponse.json({ ok: true });
}
