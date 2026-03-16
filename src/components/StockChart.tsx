'use client';

import { useState, useEffect } from 'react';
import CandlestickChart from './CandlestickChart';
import LoadingSpinner from './LoadingSpinner';

interface StockChartProps {
  ticker: string;
}

type Timeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function StockChart({ ticker }: StockChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('daily');
  const [data, setData] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [patternSummary, setPatternSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/historical/${ticker}?timeframe=${timeframe}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        
        const result = await response.json();
        setData(result.data || []);
        setPatterns(result.patterns || []);
        setPatternSummary(result.patternSummary || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
        console.error('Error fetching chart data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [ticker, timeframe]);
  
  const timeframes: { value: Timeframe; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];
  
  return (
    <div>
      {/* Timeframe selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-slate-400 text-sm">Timeframe:</span>
        <div className="flex gap-2">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeframe === tf.value
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Chart */}
      {loading ? (
        <div className="bg-slate-900 rounded-xl p-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
          <div className="text-red-400 mb-2">⚠️ Error Loading Chart</div>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      ) : (
        <CandlestickChart ticker={ticker} data={data} timeframe={timeframe} patterns={patterns} />
      )}
    </div>
  );
}

