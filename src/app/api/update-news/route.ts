import { NextResponse } from 'next/server';
import { refreshNews } from '@/lib/newsScraper';

// Cron: every 4 hours — matches NEWS_CACHE_TTL_HOURS = 4
// Scrapes all configured RSS feeds and HTML fallbacks for USE-related news
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await refreshNews();
    const totals = Object.fromEntries(
      Object.entries(result).map(([ticker, articles]) => [ticker, articles.length])
    );
    const totalArticles = Object.values(totals).reduce((s, n) => s + n, 0);

    return NextResponse.json({
      success: true,
      message: 'News refreshed',
      totalArticles,
      articleCounts: totals,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[update-news] Error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh news', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
