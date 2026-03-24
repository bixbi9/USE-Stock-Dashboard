import { NextResponse } from 'next/server';
import { refreshDividends } from '@/lib/newsScraper';

// Cron: daily at 10:00 EAT (07:00 UTC) on weekdays
// Also runs on-demand via GET or POST (manual trigger / Vercel cron)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await refreshDividends();
    const totals = Object.fromEntries(
      Object.entries(result).map(([ticker, divs]) => [ticker, divs.length])
    );

    return NextResponse.json({
      success: true,
      message: 'Dividend announcements refreshed',
      dividendCounts: totals,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[update-dividends] Error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh dividends', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
