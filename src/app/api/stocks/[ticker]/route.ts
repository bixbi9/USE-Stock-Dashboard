import { NextRequest, NextResponse } from 'next/server';
import { getStockDataSync } from '@/lib/mockData';
import { fetchCurrentPrices } from '@/lib/dataFetcher';
import {
  getNewsForTicker,
  getDividendsForTicker,
  getSentimentForNews,
  isNewsCacheFresh,
  isDividendCacheFresh,
  refreshNews,
  refreshDividends,
} from '@/lib/newsScraper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker symbol is required' }, { status: 400 });
  }

  const upper = ticker.toUpperCase();

  // Kick off all refreshes in parallel so they don't block each other
  const [latestPrices] = await Promise.all([
    fetchCurrentPrices().catch(() => ({})),
    isNewsCacheFresh()     ? Promise.resolve() : refreshNews().catch(() => {}),
    isDividendCacheFresh() ? Promise.resolve() : refreshDividends().catch(() => {}),
  ]);

  const stockData = getStockDataSync(upper);
  if (!stockData) {
    return NextResponse.json({ error: `Stock data not found for ticker: ${ticker}` }, { status: 404 });
  }

  // Overlay live price if available
  if ((latestPrices as Record<string, any>)[upper]) {
    stockData.metrics = (latestPrices as Record<string, any>)[upper];
  }

  // Overlay live news
  const latestNews = getNewsForTicker(upper);
  if (latestNews.length > 0) {
    stockData.news      = latestNews.slice(0, 12);
    stockData.sentiment = getSentimentForNews(stockData.news);
  }

  // Overlay live dividends
  const latestDividends = getDividendsForTicker(upper);
  if (latestDividends.length > 0) {
    stockData.dividends = latestDividends;
  }

  return NextResponse.json({
    ...stockData,
    _meta: { fetchedAt: new Date().toISOString() },
  });
}
