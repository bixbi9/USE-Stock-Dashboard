import { NextResponse } from 'next/server';
import { refreshPrices } from '@/lib/dataFetcher';
import { refreshNews, refreshDividends } from '@/lib/newsScraper';
import { refreshFinancials } from '@/lib/financialsScraper';

// Single combined cron — runs daily at 06:00 UTC (09:00 EAT), Mon–Sat
// Executes all data refresh jobs in parallel:
//   • Prices      — scrapes African Financials for latest USE prices
//   • Dividends   — scrapes USE & AfricanFinancials for dividend announcements
//   • News        — scrapes 8 Ugandan/EA RSS feeds for stock-related news
//   • Financials  — scrapes African Financials filings for USE listed companies
// A second run fires at 11:00 UTC (14:00 EAT) on weekdays to capture the
// official end-of-day closing prices after USE market close at 13:30 EAT.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const started = Date.now();

  const [pricesResult, dividendsResult, newsResult, financialsResult] = await Promise.allSettled([
    refreshPrices(),
    refreshDividends(),
    refreshNews(),
    refreshFinancials(),
  ]);

  const summary = {
    prices: pricesResult.status === 'fulfilled'
      ? { ok: true }
      : { ok: false, error: (pricesResult.reason as Error)?.message },

    dividends: dividendsResult.status === 'fulfilled'
      ? { ok: true, total: Object.values(dividendsResult.value).flat().length }
      : { ok: false, error: (dividendsResult.reason as Error)?.message },

    news: newsResult.status === 'fulfilled'
      ? { ok: true, total: Object.values(newsResult.value).flat().length }
      : { ok: false, error: (newsResult.reason as Error)?.message },

    financials: financialsResult.status === 'fulfilled'
      ? {
          ok: true,
          totalDocuments: Object.values(financialsResult.value.byTicker).flat().length,
          missingTickers: financialsResult.value.missingTickers,
        }
      : { ok: false, error: (financialsResult.reason as Error)?.message },
  };

  const allOk = pricesResult.status === 'fulfilled'
    && dividendsResult.status === 'fulfilled'
    && newsResult.status === 'fulfilled'
    && financialsResult.status === 'fulfilled';

  return NextResponse.json({
    success: allOk,
    message: allOk ? 'All data refreshed successfully' : 'Completed with some errors',
    durationMs: Date.now() - started,
    summary,
    timestamp: new Date().toISOString(),
  }, { status: allOk ? 200 : 207 });
}

export async function POST(request: Request) {
  return GET(request);
}
