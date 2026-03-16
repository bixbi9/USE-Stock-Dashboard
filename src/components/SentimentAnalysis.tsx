'use client';

import { SentimentSummary } from '@/types/stock';

interface SentimentAnalysisProps {
  sentiment: SentimentSummary;
  ticker: string;
}

export default function SentimentAnalysis({ sentiment, ticker }: SentimentAnalysisProps) {
  const getSentimentColor = () => {
    switch (sentiment.overallSentiment) {
      case 'bullish': return 'text-emerald-400';
      case 'bearish': return 'text-red-400';
      default: return 'text-amber-400';
    }
  };
  
  const getSentimentBg = () => {
    switch (sentiment.overallSentiment) {
      case 'bullish': return 'bg-emerald-500/20 border-emerald-500/50';
      case 'bearish': return 'bg-red-500/20 border-red-500/50';
      default: return 'bg-amber-500/20 border-amber-500/50';
    }
  };
  
  const getSentimentIcon = () => {
    switch (sentiment.overallSentiment) {
      case 'bullish': return '📈';
      case 'bearish': return '📉';
      default: return '➡️';
    }
  };
  
  const total = sentiment.positiveCount + sentiment.negativeCount + sentiment.neutralCount;
  const positivePercent = (sentiment.positiveCount / total) * 100;
  const neutralPercent = (sentiment.neutralCount / total) * 100;
  const negativePercent = (sentiment.negativeCount / total) * 100;
  
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
          <span className="text-xl">🧠</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Sentiment Analysis</h3>
          <p className="text-slate-400 text-sm">AI-powered news sentiment for {ticker}</p>
        </div>
      </div>
      
      {/* Overall Sentiment */}
      <div className={`rounded-xl p-4 border ${getSentimentBg()} mb-6`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-sm mb-1">Overall Sentiment</div>
            <div className={`text-2xl font-bold capitalize ${getSentimentColor()}`}>
              {getSentimentIcon()} {sentiment.overallSentiment}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-sm mb-1">Confidence</div>
            <div className="text-xl font-bold text-white">{sentiment.confidence.toFixed(0)}%</div>
          </div>
        </div>
        
        {/* Score Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Bearish</span>
            <span>Score: {sentiment.averageScore.toFixed(2)}</span>
            <span>Bullish</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden relative">
            <div 
              className="absolute h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 opacity-30"
              style={{ width: '100%' }}
            />
            <div 
              className="absolute h-full w-1 bg-white rounded-full shadow-lg transition-all duration-500"
              style={{ left: `${((sentiment.averageScore + 1) / 2) * 100}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Sentiment Distribution */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Article Distribution</span>
          <span className="text-slate-500">{sentiment.totalArticles} articles analyzed</span>
        </div>
        
        {/* Distribution Bar */}
        <div className="h-4 bg-slate-700 rounded-full overflow-hidden flex">
          <div 
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${positivePercent}%` }}
          />
          <div 
            className="bg-amber-500 transition-all duration-500"
            style={{ width: `${neutralPercent}%` }}
          />
          <div 
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${negativePercent}%` }}
          />
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-emerald-400 text-sm font-medium">{sentiment.positiveCount} Positive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-amber-400 text-sm font-medium">{sentiment.neutralCount} Neutral</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-red-400 text-sm font-medium">{sentiment.negativeCount} Negative</span>
          </div>
        </div>
      </div>
    </div>
  );
}

