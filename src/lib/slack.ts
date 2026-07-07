const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

export async function sendSlackMessage(text: string): Promise<void> {
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    console.warn("Slack not configured — skipping notification");
    return;
  }

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL_ID,
      text,
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    console.error("Slack API error:", data.error);
  }
}

export function buildBigDealMessage(p: { closerName: string; leadName: string; amountUsd: number }): string {
  return `:tada: *Big Deal Closed!* ${p.closerName} just closed *${p.leadName}* for *$${Math.round(p.amountUsd).toLocaleString()}* :moneybag:`;
}

export function buildStreakMilestoneMessage(p: { setterName: string; days: number; tier: string }): string {
  return `:fire: *Streak Milestone!* ${p.setterName} hit a *${p.days}-day* activity streak — *${p.tier}*! :muscle:`;
}

export function buildLeaderboardMessage(rows: { name: string; revenue: number }[]): string {
  if (!rows.length) return "";
  const medals = [":first_place_medal:", ":second_place_medal:", ":third_place_medal:"];
  const lines = rows.slice(0, 5).map((r, i) => `${medals[i] ?? `${i + 1}.`} ${r.name} — $${Math.round(r.revenue).toLocaleString()}`);
  let msg = `*:trophy: Closer Leaderboard*\n${lines.join("\n")}`;
  const bottom = rows[rows.length - 1];
  if (rows.length > 1 && bottom.revenue === 0) {
    msg += `\n\n:snail: ${bottom.name} hasn't landed a deal yet — let's change that today!`;
  }
  return msg;
}

export function buildReportSummaryMessage(p: { title: string; revenue: number; closeRate: number; roas: number }): string {
  return `*:bar_chart: ${p.title}*\nRevenue: *$${Math.round(p.revenue).toLocaleString()}*  |  Close Rate: *${p.closeRate.toFixed(1)}%*  |  ROAS: *${p.roas.toFixed(2)}x*`;
}

export function buildLossDebriefMessage(params: {
  leadName: string;
  leadSource: string;
  closerName: string;
  debrief: string;
}): string {
  const { leadName, leadSource, closerName, debrief } = params;
  return [
    `:x: *Lost Call — ${leadName}*`,
    `>Source: ${leadSource}  |  Closer: ${closerName}`,
    ``,
    `*AI Loss Debrief:*`,
    debrief
      .split("\n")
      .filter(Boolean)
      .map((line) => `> ${line.replace(/\*\*(.+?)\*\*/g, "*$1*")}`)
      .join("\n"),
  ].join("\n");
}
