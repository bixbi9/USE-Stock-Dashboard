'use client';

import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { StockInfo, StockMetrics } from '@/types/stock';
import { buildPastPerformance } from '@/lib/analysis';

interface PastPerformanceProps {
  info: StockInfo;
  metrics: StockMetrics;
}

export default function PastPerformance({ info, metrics }: PastPerformanceProps) {
  const { series, summary } = buildPastPerformance(metrics);

  return (
    <section className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200">Past Performance</p>
          <h3 className="text-2xl font-semibold text-white mt-2">{info.ticker} Returns & Drawdowns</h3>
          <p className="text-slate-400 text-sm mt-1">Mirrors Simply Wall St historical return snapshot.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">5Y Total Return</p>
          <p className={`text-xl font-semibold ${summary.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {summary.totalReturnPct >= 0 ? '+' : ''}{summary.totalReturnPct.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Max drawdown {summary.maxDrawdownPct.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,1fr] gap-6">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-3">Annual Total Return</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value: number | undefined) => value != null ? `${Number(value).toFixed(1)}%` : ''}
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8
                  }}
                />
                <Bar dataKey="returnPct" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-3">Price vs Market Trend</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value.toFixed(0)}`}
                />
                <Tooltip
                  formatter={(value: number | undefined, name: string) => [
                    value != null ? `${info.currency} ${Number(value).toFixed(0)}` : '',
                    name === 'price' ? 'Price' : 'Market'
                  ]}
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 8
                  }}
                />
                <Line type="monotone" dataKey="market" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <PerformanceCard label="Best Year" value={`${summary.bestYearReturn.toFixed(1)}%`} />
        <PerformanceCard label="Worst Year" value={`${summary.worstYearReturn.toFixed(1)}%`} />
        <PerformanceCard label="Volatility" value={`${summary.volatility.toFixed(1)}%`} />
      </div>
    </section>
  );
}

function PerformanceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-white mt-2">{value}</p>
    </div>
  );
}
