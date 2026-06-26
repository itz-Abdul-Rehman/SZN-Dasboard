import { NextRequest, NextResponse } from "next/server";
import { getAdCampaigns, getAdsKpis, getAdSpendChart } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("client_id") ?? undefined;

  const [campaigns, kpis, spendChart] = await Promise.all([
    getAdCampaigns(clientId),
    getAdsKpis(clientId),
    getAdSpendChart(clientId),
  ]);

  return NextResponse.json({ campaigns, kpis, spendChart });
}
