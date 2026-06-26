import { NextResponse } from "next/server";
import { sendSlackMessage } from "@/lib/slack";

export async function GET() {
  try {
    await sendSlackMessage(
      ":white_check_mark: *SZN Dashboard connected!*\n>Slack notifications are working. Lost call debriefs will appear here."
    );
    return NextResponse.json({ ok: true, message: "Test message sent to Slack." });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
