'use client';

import { StockInfo, StockMetrics as StockMetricsType } from '@/types/stock';

interface StockMetricsProps {
  info: StockInfo;
  metrics: StockMetricsType;
}

export default function StockMetrics({ info, metrics }: StockMetricsProps) {
  const isPositive = metrics.change >= 0;
  
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Stock Header */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-bold">
              {info.ticker}
            </span>
            <span className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-lg text-xs">
              {info.sector}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">{info.name}</h3>
          <p className="text-slate-400 text-sm">{info.description}</p>
        </div>
        
        {/* Current Price */}
        <div className="text-right">
          <div className="text-4xl font-bold text-white mb-1">
            {info.currency} {metrics.currentPrice.toLocaleString()}
          </div>
          <div className={`flex items-center justify-end gap-2 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className="text-xl font-semibold">
              {isPositive ? '+' : ''}{metrics.change.toLocaleString()}
            </span>
            <span className="px-2 py-1 rounded-lg text-sm font-bold bg-opacity-20" 
                  style={{ backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
              {isPositive ? '▲' : '▼'} {Math.abs(metrics.changePercent).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/50">
        <MetricCard label="52W High" value={`${info.currency} ${metrics.high52Week.toLocaleString()}`} />
        <MetricCard label="52W Low" value={`${info.currency} ${metrics.low52Week.toLocaleString()}`} />
        <MetricCard label="Market Cap" value={metrics.marketCap} />
        <MetricCard label="Volume" value={metrics.volume.toLocaleString()} />
        <MetricCard label="Avg Volume" value={metrics.avgVolume.toLocaleString()} />
        <MetricCard label="P/E Ratio" value={metrics.peRatio.toFixed(1)} />
        <MetricCard label="Dividend Yield" value={`${metrics.dividendYield.toFixed(1)}%`} highlight />
        <MetricCard label="Last Updated" value={new Date(metrics.lastUpdated).toLocaleDateString()} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-xl ${highlight ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-800/50'}`}>
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className={`font-semibold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

