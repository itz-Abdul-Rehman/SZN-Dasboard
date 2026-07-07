import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendSlackMessage, buildLeaderboardMessage } from "@/lib/slack";
import { assertCron } from "@/lib/cron-auth";

const WON = ["closed", "paid_in_full", "split_pay"];

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export async function GET(req: Request) {
  const denied = assertCron(req);
  if (denied) return denied;

  try {
    const supabase = await createAdminClient();

    // Fetch all active closers and setters
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, role, client_id")
      .in("role", ["closer", "setter"])
      .eq("active", true);

    if (!profiles || profiles.length === 0) {
      // Send a single channel message instead when no profiles configured
      const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      await sendSlackMessage(
        `:sunrise: *Good morning — ${today}*\n\n` +
        `No closer/setter profiles configured yet. Add team members via Supabase Auth to receive personalized daily targets.\n\n` +
        `_Set up profiles in: Supabase → Table Editor → profiles_`
      );
      return NextResponse.json({ ok: true, sent: 0, message: "No profiles found — sent channel message." });
    }

    // Get month-to-date performance per closer
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split("T")[0];
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

    const { data: calls } = await supabase
      .from("calls")
      .select("closer_id, outcome, revenue")
      .gte("call_date", monthStartStr);

    // Days remaining in month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - now.getDate() + 1;
    const daysElapsed = now.getDate() - 1 || 1;

    let sent = 0;

    for (const profile of profiles) {
      const myCalls = calls?.filter((c) => c.closer_id === profile.id) ?? [];
      const myRevenue = myCalls.filter((c) => c.outcome === "closed").reduce((s, c) => s + (c.revenue ?? 0), 0);
      const myCloseRate = myCalls.length > 0 ? ((myCalls.filter((c) => c.outcome === "closed").length / myCalls.length) * 100).toFixed(1) : "0.0";

      let message = "";

      if (profile.role === "closer") {
        const dailyPace = daysElapsed > 0 ? myRevenue / daysElapsed : 0;
        const projectedRevenue = dailyPace * daysInMonth;
        const callsToday = Math.ceil(myCalls.length / daysElapsed);
        message = [
          `:telephone_receiver: *Good morning ${profile.full_name} — ${today}*`,
          ``,
          `*Your Month-to-Date:*`,
          `> Revenue: *${fmt(myRevenue)}* | Close Rate: *${myCloseRate}%* | Calls: *${myCalls.length}*`,
          `> Projected month-end: *${fmt(projectedRevenue)}*`,
          ``,
          `*Today's Target:*`,
          `> Aim for *${callsToday} calls* and *${(parseFloat(myCloseRate) * 1.1).toFixed(0)}%* close rate to stay on pace.`,
          `> *${daysLeft} days* left in the month. Make them count. 💪`,
        ].join("\n");
      } else if (profile.role === "setter") {
        const { data: setterLogs } = await supabase
          .from("setter_logs")
          .select("calls_booked, conversations")
          .eq("setter_id", profile.id)
          .gte("log_date", monthStartStr);

        const totalBooked = setterLogs?.reduce((s, l) => s + (l.calls_booked ?? 0), 0) ?? 0;
        const dailyBookingAvg = daysElapsed > 0 ? (totalBooked / daysElapsed).toFixed(1) : "0";
        message = [
          `:calendar: *Good morning ${profile.full_name} — ${today}*`,
          ``,
          `*Your Month-to-Date:*`,
          `> Calls Booked: *${totalBooked}* | Daily Avg: *${dailyBookingAvg}*`,
          ``,
          `*Today's Target:*`,
          `> Book *${Math.ceil(Number(dailyBookingAvg) * 1.1) || 5}+ calls* today to stay ahead of pace.`,
          `> *${daysLeft} days* left. Keep the pipeline full! 🚀`,
        ].join("\n");
      }

      if (message) {
        await sendSlackMessage(message);
        sent++;
      }
    }

    // Fame / shame closer leaderboard → Slack
    const board = profiles
      .filter((p) => p.role === "closer")
      .map((p) => ({
        name: p.full_name,
        revenue: (calls ?? [])
          .filter((c) => c.closer_id === p.id && WON.includes(c.outcome))
          .reduce((s, c) => s + (c.revenue ?? 0), 0),
      }))
      .sort((a, b) => b.revenue - a.revenue);
    if (board.length) await sendSlackMessage(buildLeaderboardMessage(board));

    return NextResponse.json({ ok: true, sent, profiles: profiles.length, leaderboard: board.length });
  } catch (err) {
    console.error("Daily targets error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
