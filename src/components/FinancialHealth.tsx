'use client';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { StockInfo, StockMetrics } from '@/types/stock';
import { buildFinancialHealth } from '@/lib/analysis';

interface FinancialHealthProps {
  info: StockInfo;
  metrics: StockMetrics;
}

export default function FinancialHealth({ info, metrics }: FinancialHealthProps) {
  const { score, signals } = buildFinancialHealth(metrics);

  return (
    <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Financial Health</p>
          <h3 className="text-2xl font-semibold text-white mt-2">Balance Sheet Strength</h3>
          <p className="text-slate-400 text-sm mt-1">
            Modeled health ratios similar to Simply Wall St financial health tab.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Health Score</p>
          <p className="text-3xl font-semibold text-white">{score}/100</p>
          <p className="text-xs text-slate-400 mt-1">{info.currency} liquidity focus</p>
        </div>
      </div>

      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={signals} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: '#e2e8f0', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(0)}/100`}
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8
                }}
              />
              <Bar dataKey="score" fill="#38bdf8" radius={[6, 6, 6, 6]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {signals.map((signal) => (
          <div key={signal.label} className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{signal.label}</p>
            <p className="text-lg font-semibold text-white mt-2">{signal.detail}</p>
            <p className="text-xs text-slate-400 mt-1">{signal.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
