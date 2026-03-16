'use client';

import { useState, useMemo } from 'react';
import { StockInfo, StockMetrics } from '@/types/stock';

interface Props {
  info: StockInfo;
  metrics: StockMetrics;
}

type Scenario = 'bull' | 'base' | 'bear';

const SCENARIOS: Record<Scenario, { revGrowth: number; fcfMargin: number; wacc: number; tgr: number; label: string }> = {
  bull: { revGrowth: 20, fcfMargin: 30, wacc: 8, tgr: 3.5, label: 'Bull Case' },
  base: { revGrowth: 12, fcfMargin: 22, wacc: 10, tgr: 2.5, label: 'Base Case' },
  bear: { revGrowth: 5, fcfMargin: 14, wacc: 12, tgr: 1.5, label: 'Bear Case' },
};

function parseMarketCapToNum(mc: string): number {
  const val = parseFloat(mc.replace(/[^0-9.]/g, '') || '0');
  if (mc.toUpperCase().includes('T')) return val * 1e12;
  if (mc.toUpperCase().includes('B')) return val * 1e9;
  if (mc.toUpperCase().includes('M')) return val * 1e6;
  return val;
}

function computeDCFModel(
  baseRevenue: number,
  sharesOutstanding: number,
  netDebt: number,
  wacc: number,
  tgr: number,
  revGrowth: number,
  fcfMargin: number
) {
  const waccR = wacc / 100;
  const tgrR = tgr / 100;
  const growthR = revGrowth / 100;
  const fcfR = fcfMargin / 100;
  const YEARS = 7;

  let pvFCF = 0;
  let lastFCF = 0;
  const projRevenues: number[] = [];
  const projFCFs: number[] = [];
  const discountedFCFs: number[] = [];
  let rev = baseRevenue;

  for (let i = 1; i <= YEARS; i++) {
    const yr_growth = Math.max(growthR * Math.pow(0.85, i - 1), tgrR);
    rev = rev * (1 + yr_growth);
    const fcf = rev * fcfR;
    const df = Math.pow(1 + waccR, i);
    const pv = fcf / df;
    pvFCF += pv;
    lastFCF = fcf;
    projRevenues.push(rev);
    projFCFs.push(fcf);
    discountedFCFs.push(pv);
  }

  const terminalValue = (lastFCF * (1 + tgrR)) / (waccR - tgrR);
  const pvTerminal = terminalValue / Math.pow(1 + waccR, YEARS);
  const equityValue = pvFCF + pvTerminal - netDebt;
  const impliedPrice = sharesOutstanding > 0 ? equityValue / sharesOutstanding : 0;

  return { impliedPrice, pvFCF, pvTerminal, projRevenues, projFCFs, discountedFCFs };
}

function computeReverseDCF(
  baseRevenue: number,
  sharesOutstanding: number,
  netDebt: number,
  currentPrice: number,
  wacc: number,
  tgr: number,
  fcfMargin: number
) {
  const waccR = wacc / 100;
  const tgrR = tgr / 100;
  const fcfR = fcfMargin / 100;
  const targetEV = currentPrice * sharesOutstanding + netDebt;

  let lo = 0, hi = 1;
  for (let iter = 0; iter < 60; iter++) {
    const mid = (lo + hi) / 2;
    let pvFCF = 0;
    let lastFCF = 0;
    let rev = baseRevenue;
    for (let i = 1; i <= 7; i++) {
      rev = baseRevenue * Math.pow(1 + mid, i);
      const fcf = rev * fcfR;
      pvFCF += fcf / Math.pow(1 + waccR, i);
      lastFCF = fcf;
    }
    const tv = (lastFCF * (1 + tgrR)) / (waccR - tgrR);
    const ev = pvFCF + tv / Math.pow(1 + waccR, 7);
    if (ev < targetEV) lo = mid; else hi = mid;
  }
  return ((lo + hi) / 2) * 100;
}

function formatCap(n: number, currency: string) {
  if (n >= 1e12) return `${currency} ${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${currency} ${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${currency} ${(n / 1e6).toFixed(1)}M`;
  return `${currency} ${n.toLocaleString()}`;
}

export default function DCFValuation({ info, metrics }: Props) {
  const [scenario, setScenario] = useState<Scenario>('base');
  const [wacc, setWacc] = useState(10);
  const [tgr, setTgr] = useState(2.5);
  const [revGrowth, setRevGrowth] = useState(12);
  const [fcfMargin, setFcfMargin] = useState(22);

  const marketCap = parseMarketCapToNum(metrics.marketCap);
  const sharesOutstanding = marketCap > 0 && metrics.currentPrice > 0 ? marketCap / metrics.currentPrice : 1e9;
  const baseRevenue = marketCap > 0 ? marketCap * 0.18 : metrics.currentPrice * 1_500_000;
  const netDebt = baseRevenue * 0.05;

  const result = useMemo(
    () => computeDCFModel(baseRevenue, sharesOutstanding, netDebt, wacc, tgr, revGrowth, fcfMargin),
    [baseRevenue, sharesOutstanding, netDebt, wacc, tgr, revGrowth, fcfMargin]
  );

  const impliedCAGR = useMemo(
    () => computeReverseDCF(baseRevenue, sharesOutstanding, netDebt, metrics.currentPrice, wacc, tgr, fcfMargin),
    [baseRevenue, sharesOutstanding, netDebt, metrics.currentPrice, wacc, tgr, fcfMargin]
  );

  const upside = result.impliedPrice > 0
    ? ((result.impliedPrice - metrics.currentPrice) / metrics.currentPrice) * 100
    : 0;

  const handleScenario = (s: Scenario) => {
    setScenario(s);
    const sc = SCENARIOS[s];
    setWacc(sc.wacc);
    setTgr(sc.tgr);
    setRevGrowth(sc.revGrowth);
    setFcfMargin(sc.fcfMargin);
  };

  const scenarioPrices = useMemo(() => {
    return Object.entries(SCENARIOS).map(([key, sc]) => {
      const r = computeDCFModel(baseRevenue, sharesOutstanding, netDebt, sc.wacc, sc.tgr, sc.revGrowth, sc.fcfMargin);
      const pct = r.impliedPrice > 0 ? ((r.impliedPrice - metrics.currentPrice) / metrics.currentPrice) * 100 : 0;
      return { key: key as Scenario, label: sc.label, price: r.impliedPrice, pct };
    });
  }, [baseRevenue, sharesOutstanding, netDebt, metrics.currentPrice]);

  const currentYear = new Date().getFullYear();
  const projYears = Array.from({ length: 7 }, (_, i) => `FY${currentYear + i + 1}E`);

  const fmtShares = sharesOutstanding >= 1e9
    ? `${(sharesOutstanding / 1e9).toFixed(2)}B`
    : sharesOutstanding >= 1e6
    ? `${(sharesOutstanding / 1e6).toFixed(1)}M`
    : sharesOutstanding.toLocaleString();

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-7 bg-cyan-500 rounded-full" />
        <div>
          <h2 className="text-xl font-bold text-white">DCF Valuation Model</h2>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Interactive Discounted Cash Flow · {info.ticker}</p>
        </div>
      </div>

      {/* Scenario Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(Object.keys(SCENARIOS) as Scenario[]).map(s => (
          <button
            key={s}
            onClick={() => handleScenario(s)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              scenario === s
                ? s === 'bull'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : s === 'base'
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                  : 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
            }`}
          >
            {SCENARIOS[s].label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Controls Panel */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 self-start">
          <h3 className="text-sm font-bold text-white mb-5">Model Inputs</h3>

          {[
            { label: 'WACC', value: wacc, set: setWacc, min: 7, max: 15, step: 0.5, fmt: (v: number) => `${v.toFixed(1)}%` },
            { label: 'Terminal Growth Rate', value: tgr, set: setTgr, min: 0.5, max: 5, step: 0.5, fmt: (v: number) => `${v.toFixed(1)}%` },
            { label: 'Revenue Growth (Yr 1)', value: revGrowth, set: setRevGrowth, min: 2, max: 40, step: 1, fmt: (v: number) => `${v}%` },
            { label: 'FCF Margin', value: fcfMargin, set: setFcfMargin, min: 5, max: 45, step: 1, fmt: (v: number) => `${v}%` },
          ].map(({ label, value, set, min, max, step, fmt }) => (
            <div key={label} className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400">{label}</span>
                <span className="text-xs font-bold text-cyan-400 font-mono">{fmt(value)}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => set(parseFloat(e.target.value))}
                className="w-full h-1 rounded appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #22d3ee ${((value - min) / (max - min)) * 100}%, #334155 ${((value - min) / (max - min)) * 100}%)`,
                  accentColor: '#22d3ee',
                }}
              />
            </div>
          ))}

          <div className="pt-4 border-t border-slate-700 space-y-3">
            <div>
              <div className="text-xs text-slate-500">Projection Period</div>
              <div className="text-sm font-mono text-slate-300">7 Years</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Est. Shares Outstanding</div>
              <div className="text-sm font-mono text-slate-300">{fmtShares}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Est. Base Revenue (FY0)</div>
              <div className="text-sm font-mono text-slate-300">{formatCap(baseRevenue, info.currency)}</div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-2 space-y-4">
          {/* Implied Price */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Implied Share Price</div>
            <div
              className="text-4xl font-bold font-mono"
              style={{ color: upside >= 0 ? '#2dd4bf' : '#f87171' }}
            >
              {metrics.currentPrice < 100
                ? `${info.currency} ${result.impliedPrice.toFixed(2)}`
                : `${info.currency} ${Math.round(result.impliedPrice).toLocaleString()}`}
            </div>
            <div
              className="text-sm font-mono mt-2"
              style={{ color: upside >= 0 ? '#4ade80' : '#f87171' }}
            >
              {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%{' '}
              {upside >= 0 ? 'upside' : 'downside'} vs. current{' '}
              {info.currency} {metrics.currentPrice.toLocaleString()}
            </div>
          </div>

          {/* Reverse DCF */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">Reverse DCF — What's Priced In?</h4>
            <div className="text-2xl font-bold font-mono text-blue-300">~{impliedCAGR.toFixed(0)}% Revenue CAGR</div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The market is pricing in approximately{' '}
              <strong className="text-blue-300">{impliedCAGR.toFixed(0)}% revenue CAGR</strong> over 7 years to justify{' '}
              {info.currency} {metrics.currentPrice.toLocaleString()} at {wacc}% WACC and {fcfMargin}% FCF margin.
            </p>
          </div>

          {/* Scenario Comparison */}
          <div className="grid grid-cols-3 gap-3">
            {scenarioPrices.map(({ key, label, price, pct }) => (
              <div
                key={key}
                className={`bg-slate-800/60 rounded-xl p-4 text-center border ${
                  key === 'bull'
                    ? 'border-emerald-500/20'
                    : key === 'base'
                    ? 'border-blue-500/20'
                    : 'border-red-500/20'
                }`}
              >
                <div
                  className="text-xs uppercase tracking-wider mb-1 font-semibold"
                  style={{ color: key === 'bull' ? '#4ade80' : key === 'base' ? '#60a5fa' : '#f87171' }}
                >
                  {label}
                </div>
                <div
                  className="text-lg font-bold font-mono"
                  style={{ color: key === 'bull' ? '#4ade80' : key === 'base' ? '#60a5fa' : '#f87171' }}
                >
                  {metrics.currentPrice < 100
                    ? price.toFixed(2)
                    : Math.round(price).toLocaleString()}
                </div>
                <div
                  className="text-xs font-mono mt-1"
                  style={{ color: key === 'bull' ? '#4ade80' : key === 'base' ? '#60a5fa' : '#f87171' }}
                >
                  {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          {/* Projection Table */}
          <div className="overflow-x-auto bg-slate-800/60 border border-slate-700 rounded-xl">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-3 text-slate-400 font-semibold uppercase tracking-wider bg-slate-800/80">
                    Metric
                  </th>
                  {projYears.map(y => (
                    <th
                      key={y}
                      className="p-3 text-right text-slate-400 font-semibold uppercase tracking-wider bg-slate-800/80 whitespace-nowrap"
                    >
                      {y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors">
                  <td className="p-3 font-semibold text-white">Revenue</td>
                  {result.projRevenues.map((r, i) => (
                    <td key={i} className="p-3 text-right font-mono text-slate-300 whitespace-nowrap">
                      {formatCap(r, info.currency)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-slate-800 hover:bg-slate-700/30 transition-colors">
                  <td className="p-3 font-semibold text-white">Free Cash Flow</td>
                  {result.projFCFs.map((f, i) => (
                    <td key={i} className="p-3 text-right font-mono text-slate-300 whitespace-nowrap">
                      {formatCap(f, info.currency)}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-slate-700/30 transition-colors">
                  <td className="p-3 font-semibold text-white">PV of FCF</td>
                  {result.discountedFCFs.map((d, i) => (
                    <td key={i} className="p-3 text-right font-mono whitespace-nowrap" style={{ color: '#2dd4bf' }}>
                      {formatCap(d, info.currency)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'PV of FCFs', value: formatCap(result.pvFCF, info.currency), color: '#2dd4bf' },
              { label: 'PV of Terminal Value', value: formatCap(result.pvTerminal, info.currency), color: '#60a5fa' },
              { label: 'Equity Value', value: formatCap(result.pvFCF + result.pvTerminal - netDebt, info.currency), color: '#a78bfa' },
              { label: 'Implied Price', value: metrics.currentPrice < 100 ? `${info.currency} ${result.impliedPrice.toFixed(2)}` : `${info.currency} ${Math.round(result.impliedPrice).toLocaleString()}`, color: upside >= 0 ? '#4ade80' : '#f87171' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">{label}</div>
                <div className="text-sm font-bold font-mono whitespace-nowrap overflow-hidden text-ellipsis" style={{ color }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
