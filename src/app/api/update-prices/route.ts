import { NextResponse } from 'next/server';
import { refreshPrices } from '@/lib/dataFetcher';
import { refreshNews } from '@/lib/newsScraper';

// This API route can be called by a cron job (Vercel Cron, GitHub Actions, etc.)
// to update stock prices daily
export async function GET(request: Request) {
  try {
    // Verify the request is from a trusted source (cron job)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await refreshPrices();
    await refreshNews();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Prices updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating prices:', error);
    return NextResponse.json(
      { error: 'Failed to update prices', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggers
export async function POST(request: Request) {
  return GET(request);
}

