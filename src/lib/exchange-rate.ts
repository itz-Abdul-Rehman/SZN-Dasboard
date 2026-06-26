const API_KEY = process.env.EXCHANGE_RATE_API_KEY;

// Cache rates in memory for the process lifetime (refreshed on server restart)
let cachedRates: Record<string, number> = {};
let cacheTime = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function getRatesToUSD(): Promise<Record<string, number>> {
  if (!API_KEY) return {};

  const now = Date.now();
  if (cachedRates && now - cacheTime < CACHE_TTL_MS) return cachedRates;

  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`);
    const data = await res.json();
    if (data.result !== "success") throw new Error(data["error-type"]);

    // Store inverse rates: how many units of currency X = 1 USD
    // data.conversion_rates gives: 1 USD = X units of each currency
    // To convert X units → USD: divide by rate
    cachedRates = data.conversion_rates as Record<string, number>;
    cacheTime = now;
    return cachedRates;
  } catch (err) {
    console.error("Exchange rate fetch failed:", err);
    return cachedRates; // return stale cache on error
  }
}

// Convert an amount in `fromCurrency` to USD
export async function toUSD(amount: number, fromCurrency: string): Promise<number> {
  if (!fromCurrency || fromCurrency === "USD") return amount;
  const rates = await getRatesToUSD();
  const rate = rates[fromCurrency.toUpperCase()];
  if (!rate || rate === 0) return amount; // fallback: return as-is
  return amount / rate;
}
