import { NextResponse } from "next/server";
import {
  getMasterKpis,
  getCloserLeaderboard,
  getClientGoalProgress,
  getRevenueChartData,
  getCallOutcomeDistribution,
} from "@/lib/db/queries";

export async function GET() {
  const [kpis, leaderboard, clientGoals, revenueChart, outcomeData] = await Promise.all([
    getMasterKpis(),
    getCloserLeaderboard(),
    getClientGoalProgress(),
    getRevenueChartData(),
    getCallOutcomeDistribution(),
  ]);

  return NextResponse.json({ kpis, leaderboard, clientGoals, revenueChart, outcomeData });
}
