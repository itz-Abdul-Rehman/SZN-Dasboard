import { NextResponse } from "next/server";
import { getCallLogs } from "@/lib/db/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page    = parseInt(searchParams.get("page")    ?? "1", 10);
  const perPage = parseInt(searchParams.get("perPage") ?? "8",  10);
  const search  = searchParams.get("search")  ?? "";
  const outcome = searchParams.get("outcome") ?? "all";
  const preset  = searchParams.get("preset")  ?? "thismonth";

  const result = await getCallLogs({ page, perPage, search: search || undefined, outcome, preset });
  return NextResponse.json(result);
}
