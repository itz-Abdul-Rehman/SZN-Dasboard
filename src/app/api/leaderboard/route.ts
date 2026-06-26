import { NextResponse } from "next/server";
import { getFullLeaderboard } from "@/lib/db/queries";

export async function GET() {
  const data = await getFullLeaderboard();
  return NextResponse.json(data);
}
