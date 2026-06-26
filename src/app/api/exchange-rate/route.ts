import { NextResponse } from "next/server";
import { getRatesToUSD } from "@/lib/exchange-rate";

export async function GET() {
  try {
    const rates = await getRatesToUSD();
    const supported = ["USD", "GBP", "EUR", "AED", "CAD", "AUD", "INR", "PKR"];
    const filtered = Object.fromEntries(
      supported.map((c) => [c, rates[c] ?? null])
    );
    return NextResponse.json({ ok: true, base: "USD", rates: filtered });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
