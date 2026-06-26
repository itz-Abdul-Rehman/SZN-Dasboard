import { NextResponse } from "next/server";
import { getTaggableLeads, updateCallTag } from "@/lib/db/queries";

export async function GET() {
  const leads = await getTaggableLeads();
  return NextResponse.json({ leads });
}

export async function PATCH(request: Request) {
  const { callId, tag } = await request.json();
  if (!callId) return NextResponse.json({ error: "callId required" }, { status: 400 });

  await updateCallTag(callId, tag ?? null);
  return NextResponse.json({ ok: true });
}
