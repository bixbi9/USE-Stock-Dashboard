import { NextResponse } from 'next/server';
import { fetchCurrentPrices } from '@/lib/dataFetcher';

// Lightweight endpoint returning current price data for all USE stocks.
// Used by PeerWatchlist to display live prices without fetching full stock payloads.
export async function GET() {
  const prices = await fetchCurrentPrices();
  const result: Record<string, { currentPrice: number; change: number; changePercent: number }> = {};
  for (const [ticker, m] of Object.entries(prices)) {
    result[ticker] = {
      currentPrice: m.currentPrice,
      change: m.change,
      changePercent: m.changePercent,
    };
  }
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
