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
