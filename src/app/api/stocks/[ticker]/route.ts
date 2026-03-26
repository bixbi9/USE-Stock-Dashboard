import { NextRequest, NextResponse } from 'next/server';
import { getStockDataSync } from '@/lib/mockData';
import { fetchCurrentPrices } from '@/lib/dataFetcher';
import { getFinancialsSnapshot } from '@/lib/financialsScraper';
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

  // Only await the price fetch — it uses Redis so it's fast on warm cache.
  // News and dividend scrapes hit multiple external URLs and can take 5–15 s;
  // firing them in the background lets the response return immediately and
  // the cache warms up for the next request.
  const latestPrices = await fetchCurrentPrices().catch(() => ({} as Record<string, any>));

  if (!isNewsCacheFresh())     refreshNews().catch(() => {});
  if (!isDividendCacheFresh()) refreshDividends().catch(() => {});

  const stockData = getStockDataSync(upper);
  if (!stockData) {
    return NextResponse.json(
      { error: `Stock data not found for ticker: ${ticker}` },
      { status: 404 }
    );
  }

  // Overlay live price if available
  if (latestPrices[upper]) {
    stockData.metrics = latestPrices[upper];
  }

  // Overlay live news (uses whatever is in cache right now)
  const latestNews = getNewsForTicker(upper);
  if (latestNews.length > 0) {
    stockData.news      = latestNews.slice(0, 12);
    stockData.sentiment = getSentimentForNews(stockData.news);
  }

  // Overlay live dividends (uses whatever is in cache right now)
  const latestDividends = getDividendsForTicker(upper);
  if (latestDividends.length > 0) {
    stockData.dividends = latestDividends;
  }

  // Overlay latest financial documents (from African Financials)
  const financialsSnapshot = await getFinancialsSnapshot();
  if (financialsSnapshot?.byTicker?.[upper]?.length) {
    stockData.financials = financialsSnapshot.byTicker[upper];
    stockData.financialsMeta = {
      updatedAt: financialsSnapshot.updatedAt,
      sourceUrl: financialsSnapshot.sourceUrl,
    };
  }

  return NextResponse.json({
    ...stockData,
    _meta: { fetchedAt: new Date().toISOString() },
  });
}
