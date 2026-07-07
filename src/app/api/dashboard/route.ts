import { NextResponse } from "next/server";
import {
  getMasterKpis,
  getCloserLeaderboard,
  getClientGoalProgress,
  getRevenueChartData,
  getCallOutcomeDistribution,
  getKpiTrends,
} from "@/lib/db/queries";

export async function GET() {
  const [kpis, leaderboard, clientGoals, revenueChart, outcomeData, trends] = await Promise.all([
    getMasterKpis(),
    getCloserLeaderboard(),
    getClientGoalProgress(),
    getRevenueChartData(),
    getCallOutcomeDistribution(),
    getKpiTrends(),
  ]);

  return NextResponse.json({ kpis, leaderboard, clientGoals, revenueChart, outcomeData, trends });
}
