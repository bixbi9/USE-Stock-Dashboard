'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { StockInfo, StockMetrics, SentimentSummary } from '@/types/stock';
import { buildForecast } from '@/lib/analysis';

interface FutureOutlookProps {
  info: StockInfo;
  metrics: StockMetrics;
  sentiment: SentimentSummary;
}

const formatCompact = (value: number) => {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}T`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
};

export default function FutureOutlook({ info, metrics, sentiment }: FutureOutlookProps) {
  const { series, summary } = buildForecast(metrics, sentiment);

  return (
    <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Future Snapshot</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-white mt-2">
            {info.name} — Forecast & Valuation
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Inspired by Simply Wall St future performance insights and growth charts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ScorePill label="Value Score" value={summary.valueScore} />
          <ScorePill label="Health Score" value={summary.healthScore} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
        <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Earnings & Revenue Growth</h3>
              <p className="text-slate-400 text-xs">3-year modeled projections</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Fair Value Estimate</p>
              <p className="text-white font-semibold">
                {info.currency} {summary.fairValue.toFixed(2)}
              </p>
              <p className={`text-xs ${summary.discountPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {summary.discountPct >= 0 ? '+' : ''}{summary.discountPct.toFixed(1)}% to fair value
              </p>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatCompact(value)}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8
                  }}
                  formatter={(value: number, name: string) => [
                    `${info.currency} ${formatCompact(value)}`,
                    name === 'revenue' ? 'Revenue' : 'Earnings'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#earningsFill)"
                  name="Earnings"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <InsightCard title="Earnings Growth" value={`${summary.earningsGrowthPct.toFixed(1)}%`} detail="Expected annual growth" />
          <InsightCard title="Revenue Growth" value={`${summary.revenueGrowthPct.toFixed(1)}%`} detail="Forecast CAGR" />
          <InsightCard
            title="Analyst Sentiment"
            value={sentiment.overallSentiment.toUpperCase()}
            detail={`${(sentiment.confidence).toFixed(0)}% confidence`}
            tone={sentiment.overallSentiment === 'bullish' ? 'positive' : sentiment.overallSentiment === 'bearish' ? 'negative' : 'neutral'}
          />
          <InsightCard
            title="Price Momentum"
            value={`${metrics.changePercent >= 0 ? '+' : ''}${metrics.changePercent.toFixed(2)}%`}
            detail="Latest trading session"
            tone={metrics.changePercent >= 0 ? 'positive' : 'negative'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {summary.checks.map((check) => (
          <div
            key={check.label}
            className={`rounded-2xl border p-4 ${
              check.pass
                ? 'border-emerald-500/40 bg-emerald-500/10'
                : 'border-slate-700/60 bg-slate-900/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">{check.label}</h4>
              <span className={`text-xs font-semibold ${check.pass ? 'text-emerald-400' : 'text-slate-400'}`}>
                {check.pass ? 'Pass' : 'Watch'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">{check.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function InsightCard({
  title,
  value,
  detail,
  tone = 'neutral'
}: {
  title: string;
  value: string;
  detail: string;
  tone?: 'positive' | 'negative' | 'neutral';
}) {
  const toneClasses =
    tone === 'positive'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : tone === 'negative'
      ? 'border-red-500/30 bg-red-500/10 text-red-300'
      : 'border-slate-700/60 bg-slate-900/70 text-slate-200';

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <p className="text-2xl font-semibold mt-2">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{detail}</p>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-2 rounded-full bg-slate-800 border border-slate-700/60 text-center">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-white">{value}/100</p>
    </div>
  );
}
