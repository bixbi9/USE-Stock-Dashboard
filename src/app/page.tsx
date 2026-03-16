'use client';

import { useState, useEffect } from 'react';
import { StockData, USE_STOCKS } from '@/types/stock';
import StockSelector from '@/components/StockSelector';
import StockMetrics from '@/components/StockMetrics';
import SentimentAnalysis from '@/components/SentimentAnalysis';
import NewsArticles from '@/components/NewsArticles';
import DividendAnnouncements from '@/components/DividendAnnouncements';
import CorporateActions from '@/components/CorporateActions';
import StockChart from '@/components/StockChart';
import PatternDisplay from '@/components/PatternDisplay';
import LoadingSpinner from '@/components/LoadingSpinner';
import FutureOutlook from '@/components/FutureOutlook';
import PastPerformance from '@/components/PastPerformance';
import FinancialHealth from '@/components/FinancialHealth';
import PriceTargetHistory from '@/components/PriceTargetHistory';
import DCFValuation from '@/components/DCFValuation';
import ComparableAnalysis from '@/components/ComparableAnalysis';
import RiskAnalysis from '@/components/RiskAnalysis';
import PeerWatchlist from '@/components/PeerWatchlist';
import TechnicalAnalysis from '@/components/TechnicalAnalysis';

export default function Home() {
  const [selectedTicker, setSelectedTicker] = useState(USE_STOCKS[0].ticker);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [patternSummary, setPatternSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newsFetchedAt, setNewsFetchedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchStockData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/stocks/${selectedTicker}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data for ${selectedTicker}`);
        }
        
        const data = await response.json();
        setStockData(data);
        setNewsFetchedAt(data._meta?.fetchedAt);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    const fetchPatternData = async () => {
      try {
        const response = await fetch(`/api/historical/${selectedTicker}?timeframe=daily`);
        if (response.ok) {
          const result = await response.json();
          setPatterns(result.patterns || []);
          setPatternSummary(result.patternSummary || null);
        }
      } catch (err) {
        console.error('Error fetching pattern data:', err);
      }
    };

    fetchStockData();
    fetchPatternData();
  }, [selectedTicker]);

  const handleNewsRefresh = async () => {
    const response = await fetch(`/api/stocks/${selectedTicker}`);
    if (!response.ok) return;
    const data = await response.json();
    setStockData(data);
    setNewsFetchedAt(data._meta?.fetchedAt);
  };

  return (
    <main className="min-h-screen py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm mb-4">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Live Market Data
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Uganda Securities Exchange
          </h1>
          <p className="text-slate-400 text-lg">
            Stock Analysis • Sentiment Tracking • Corporate Actions
          </p>
        </header>

        {/* Stock Selector */}
        <StockSelector 
          selectedTicker={selectedTicker} 
          onSelectTicker={setSelectedTicker} 
        />

        {/* Main Content */}
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-red-400 mb-2">Error Loading Data</h3>
            <p className="text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => setSelectedTicker(selectedTicker)}
              className="mt-4 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              Try Again
            </button>
        </div>
        ) : stockData ? (
          <div className="space-y-6 animate-fade-in">
            {/* Stock Metrics */}
            <StockMetrics info={stockData.info} metrics={stockData.metrics} />

            {/* ── Market Intelligence: News + Dividends (top priority) ── */}
            <NewsArticles
              articles={stockData.news}
              ticker={selectedTicker}
              onRefresh={handleNewsRefresh}
              lastFetched={newsFetchedAt}
            />
            <DividendAnnouncements
              dividends={stockData.dividends}
              currency={stockData.info.currency}
            />

            {/* Future Outlook */}
            <FutureOutlook
              info={stockData.info}
              metrics={stockData.metrics}
              sentiment={stockData.sentiment}
            />

            {/* Past Performance + Financial Health */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PastPerformance info={stockData.info} metrics={stockData.metrics} />
              <FinancialHealth info={stockData.info} metrics={stockData.metrics} />
            </div>

            {/* Price Target History */}
            <PriceTargetHistory
              info={stockData.info}
              metrics={stockData.metrics}
              sentiment={stockData.sentiment}
            />

            {/* DCF Valuation Model */}
            <DCFValuation info={stockData.info} metrics={stockData.metrics} />

            {/* Comparable Company Analysis */}
            <ComparableAnalysis info={stockData.info} metrics={stockData.metrics} />

            {/* Risk Analysis */}
            <RiskAnalysis info={stockData.info} metrics={stockData.metrics} />

            {/* Technical Analysis — price chart, MAs, RSI, Volume, levels */}
            <TechnicalAnalysis
              ticker={selectedTicker}
              info={stockData.info}
              metrics={stockData.metrics}
            />

            {/* Candlestick Chart + Pattern Recognition */}
            <StockChart ticker={selectedTicker} />
            {patternSummary && (
              <PatternDisplay patterns={patterns} patternSummary={patternSummary} />
            )}

            {/* Sentiment Analysis */}
            <SentimentAnalysis
              sentiment={stockData.sentiment}
              ticker={selectedTicker}
            />

            {/* Corporate Actions - Full Width */}
            <CorporateActions actions={stockData.corporateActions} />

            {/* USE Top Picks Watchlist */}
            <PeerWatchlist info={stockData.info} metrics={stockData.metrics} />
          </div>
        ) : null}

        {/* Footer */}
        <footer className="text-center pt-8 pb-4 border-t border-slate-800">
          <p className="text-slate-500 text-sm">
            USE Stock Dashboard © {new Date().getFullYear()} • Data for demonstration purposes
          </p>
          <p className="text-slate-600 text-xs mt-2">
            Built for BBT4206 Time Series Analysis and Forecasting
          </p>
        </footer>
        </div>
      </main>
  );
}
