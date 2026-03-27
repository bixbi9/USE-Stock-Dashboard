import { NextResponse } from 'next/server';
import { refreshDividends, refreshNews } from '@/lib/newsScraper';
import { refreshPrices } from '@/lib/dataFetcher';
import { refreshFinancials } from '@/lib/financialsScraper';

// ── Source URLs ──────────────────────────────────────────────────────────────
// These pages publish USE corporate actions, financial results, and regulatory
// filings. The cron scrapes them weekly for any new disclosures.

const FINANCIAL_SOURCES = [
  // USE official pages
  { name: 'USE Corporate Actions',   url: 'https://www.use.or.ug/content/corporate-actions' },
  { name: 'USE Listed Companies',    url: 'https://www.use.or.ug/content/listed-companies' },
  { name: 'USE Market Summary',      url: 'https://www.use.or.ug/content/market-summary' },
  // AfricanFinancials — Uganda company filings
  { name: 'AfricanFinancials USE',   url: 'https://africanfinancials.com/uganda-listed-company-documents/' },
  { name: 'AfricanFinancials Divs',  url: 'https://africanfinancials.com/uganda-securities-exchange-dividends/' },
  // Company investor-relations pages
  { name: 'MTN Uganda IR',           url: 'https://www.mtn.co.ug/investor-relations/' },
  { name: 'Stanbic Uganda IR',       url: 'https://www.stanbicbank.co.ug/uganda/personal/investor-relations' },
  { name: 'DFCU IR',                 url: 'https://www.dfcugroup.com/investor-relations/' },
  { name: 'QCIL IR',                 url: 'https://qcil.co.ug/investors/' },
  { name: 'BATU IR',                 url: 'https://www.bat.com/group/sites/UK__9D9KCY.nsf/vwPagesWebLive/DOBN7HCH' },
  { name: 'Umeme IR',                url: 'https://www.umeme.co.ug/investor-relations/' },
  { name: 'Equity Group IR',         url: 'https://equitygroupholdings.com/investor-relations/' },
  { name: 'Bank of Baroda Uganda',   url: 'https://www.bankofbarodauganda.com/investor-relations' },
];

const FETCH_OPTS: RequestInit = {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
  ...(typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? { signal: (AbortSignal as any).timeout(6_000) }
    : {}),
};

// Lightweight scrape — just HEAD-check each source and record reachability.
// The data parsing is handled by the existing parsers in newsScraper.ts.
async function checkSources() {
  const results = await Promise.allSettled(
    FINANCIAL_SOURCES.map(async (src) => {
      const res = await fetch(src.url, { ...FETCH_OPTS, method: 'HEAD' });
      return { name: src.name, url: src.url, status: res.status, ok: res.ok };
    })
  );

  return results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { name: FINANCIAL_SOURCES[i].name, url: FINANCIAL_SOURCES[i].url, status: 0, ok: false, error: (r.reason as Error)?.message }
  );
}

// Cron: weekly — Saturday 09:00 EAT (06:00 UTC)
// Full refresh: prices + dividends + news + source health check
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run all refreshes in parallel
    const [, dividendResult, newsResult, financialsResult, sourceHealth] = await Promise.allSettled([
      refreshPrices(),
      refreshDividends(),
      refreshNews(),
      refreshFinancials(),
      checkSources(),
    ]);

    const dividends = dividendResult.status === 'fulfilled' ? dividendResult.value : {};
    const news      = newsResult.status      === 'fulfilled' ? newsResult.value      : {};
    const financials = financialsResult.status === 'fulfilled' ? financialsResult.value : null;
    const health    = sourceHealth.status    === 'fulfilled' ? sourceHealth.value    : [];

    const reachable   = (health as any[]).filter(s => s.ok).length;
    const unreachable = (health as any[]).filter(s => !s.ok).map(s => s.name);

    return NextResponse.json({
      success: true,
      message: 'Weekly financial data refresh complete',
      summary: {
        totalDividendRecords: Object.values(dividends).flat().length,
        totalNewsArticles:    Object.values(news).flat().length,
        totalFinancialDocs:   financials ? Object.values(financials.byTicker).flat().length : 0,
        missingFinancials:    financials?.missingTickers ?? [],
        sourcesReachable:     reachable,
        sourcesUnreachable:   unreachable,
      },
      sourceHealth: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[update-financials] Error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh financials', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
