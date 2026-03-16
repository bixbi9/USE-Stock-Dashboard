'use client';

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { StockInfo, StockMetrics, SentimentSummary } from '@/types/stock';
import { buildPriceTargetHistory } from '@/lib/analysis';

interface PriceTargetHistoryProps {
  info: StockInfo;
  metrics: StockMetrics;
  sentiment: SentimentSummary;
}

export default function PriceTargetHistory({ info, metrics, sentiment }: PriceTargetHistoryProps) {
  const series = buildPriceTargetHistory(metrics, sentiment);

  return (
    <section className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Price Target History</p>
          <h3 className="text-xl font-semibold text-white mt-2">Analyst Target Adjustments</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Latest Target</p>
          <p className="text-lg font-semibold text-white">
            {info.currency} {series[series.length - 1].target.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="h-[170px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => value.toFixed(0)}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${info.currency} ${value.toFixed(2)}`,
                name === 'target' ? 'Price Target' : 'Market Price'
              ]}
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8
              }}
            />
            <Line type="monotone" dataKey="price" stroke="#94a3b8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="target" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <MiniStat label="Target Range" value={`${info.currency} ${series[0].target.toFixed(0)} - ${series[series.length - 1].target.toFixed(0)}`} />
        <MiniStat label="Upside" value={`${series[series.length - 1].upside.toFixed(1)}%`} />
        <MiniStat label="Confidence" value={`${series[series.length - 1].confidence.toFixed(0)}%`} />
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-white mt-2">{value}</p>
    </div>
  );
}
