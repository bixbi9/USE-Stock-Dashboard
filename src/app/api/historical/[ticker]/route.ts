import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalData } from '@/lib/dataFetcher';
import { detectCandlestickPatterns, getPatternSummary } from '@/lib/patternDetection';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const searchParams = request.nextUrl.searchParams;
  const timeframe = (searchParams.get('timeframe') || 'daily') as 'daily' | 'weekly' | 'monthly' | 'yearly';
  
  if (!ticker) {
    return NextResponse.json(
      { error: 'Ticker symbol is required' },
      { status: 400 }
    );
  }
  
  try {
    const data = await getHistoricalData(ticker.toUpperCase(), timeframe);
    
    // Detect candlestick patterns
    const patterns = detectCandlestickPatterns(data);
    const patternSummary = getPatternSummary(patterns);
    
    return NextResponse.json({
      ticker: ticker.toUpperCase(),
      timeframe,
      data,
      count: data.length,
      patterns,
      patternSummary
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

