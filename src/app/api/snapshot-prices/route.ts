import { NextResponse } from 'next/server';
import { refreshPrices } from '@/lib/dataFetcher';

// Cron: weekdays at 11:00 UTC (14:00 EAT) — 30 min after USE market close (13:30 EAT)
// Captures the official end-of-day closing prices from African Financials
// after the exchange has published its daily summary.
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await refreshPrices();

    return NextResponse.json({
      success: true,
      message: 'End-of-day price snapshot captured',
      marketSession: 'USE close (13:30 EAT)',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[snapshot-prices] Error:', error);
    return NextResponse.json(
      { error: 'Failed to snapshot prices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
