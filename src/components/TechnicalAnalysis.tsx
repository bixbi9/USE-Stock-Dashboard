'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Cell,
} from 'recharts';
import { StockInfo, StockMetrics } from '@/types/stock';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  ticker: string;
  info: StockInfo;
  metrics: StockMetrics;
}

interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ── Indicator math ──────────────────────────────────────────────────────────

function sma(closes: number[], period: number, idx: number): number | null {
  if (idx < period - 1) return null;
  const slice = closes.slice(idx - period + 1, idx + 1);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function rsi(closes: number[], period: number, idx: number): number | null {
  if (idx < period) return null;
  let gains = 0, losses = 0;
  for (let i = idx - period + 1; i <= idx; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function supportResistance(candles: Candle[]): { support: number; resistance: number } {
  const recent = candles.slice(-60);
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);
  const resistance = Math.max(...highs);
  const support = Math.min(...lows);
  return { support, resistance };
}

// ── Chart tooltip ────────────────────────────────────────────────────────────

function PriceTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-slate-300 mb-1">{label}</p>
      {payload.map((entry: any) => (
        entry.value != null && (
          <p key={entry.dataKey} style={{ color: entry.color ?? entry.stroke }}>
            {entry.name}: {currency} {Number(entry.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        )
      ))}
    </div>
  );
}

function RsiTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload.find((p: any) => p.dataKey === 'rsi')?.value;
  const color = val >= 70 ? '#f87171' : val <= 30 ? '#4ade80' : '#fbbf24';
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-slate-300 mb-1">{label}</p>
      {val != null && <p style={{ color }}>RSI(14): {val.toFixed(1)}</p>}
    </div>
  );
}

function VolumeTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  const vol = payload[0]?.value;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-slate-300 mb-1">{label}</p>
      {vol != null && <p className="text-slate-300">Vol: {Number(vol).toLocaleString()}</p>}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface LevelCardProps {
  label: string;
  value: string;
  subtext?: string;
  valueColor?: string;
}

function LevelCard({ label, value, subtext, valueColor = 'text-white' }: LevelCardProps) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${valueColor}`}>{value}</div>
      {subtext && <div className="text-xs text-slate-500 mt-0.5">{subtext}</div>}
    </div>
  );
}

interface SignalBadgeProps {
  label: string;
  verdict: string;
  verdictColor: string;
  detail: string;
}

function SignalBadge({ label, verdict, verdictColor, detail }: SignalBadgeProps) {
  return (
    <div className="flex items-start gap-3 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
      <div className="flex-1">
        <div className="text-xs text-slate-500 uppercase tracking-wider">{label}</div>
        <div className={`text-sm font-bold mt-0.5 ${verdictColor}`}>{verdict}</div>
        <div className="text-xs text-slate-400 mt-1 leading-relaxed">{detail}</div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function TechnicalAnalysis({ ticker, info, metrics }: Props) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/historical/${ticker}?timeframe=daily`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch historical data');
        return r.json();
      })
      .then(result => setCandles(result.data ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  // ── Derived indicator series ──
  const series = useMemo(() => {
    if (!candles.length) return [];
    const closes = candles.map(c => c.close);
    return candles.map((c, i) => ({
      date: c.date.slice(5),         // "MM-DD"
      close: c.close,
      volume: c.volume,
      ma50: sma(closes, 50, i),
      ma200: sma(closes, 200, i),
      rsi: rsi(closes, 14, i),
      up: c.close >= c.open,
    }));
  }, [candles]);

  // ── Current indicator values (last bar) ──
  const last = series[series.length - 1];
  const lastRsi = last?.rsi ?? null;
  const lastMa50 = last?.ma50 ?? null;
  const lastMa200 = last?.ma200 ?? null;

  const { support, resistance } = useMemo(() => supportResistance(candles), [candles]);

  const fmtPx = (n: number) =>
    metrics.currentPrice < 100
      ? `${info.currency} ${n.toFixed(2)}`
      : `${info.currency} ${Math.round(n).toLocaleString()}`;

  const rsiColor =
    lastRsi === null ? 'text-slate-400'
    : lastRsi >= 70   ? 'text-red-400'
    : lastRsi <= 30   ? 'text-emerald-400'
    : 'text-yellow-400';

  const rsiLabel =
    lastRsi === null  ? '—'
    : lastRsi >= 70   ? 'Overbought'
    : lastRsi <= 30   ? 'Oversold'
    : 'Neutral';

  const ma50Signal = lastMa50 !== null && metrics.currentPrice > lastMa50;
  const ma200Signal = lastMa200 !== null && metrics.currentPrice > lastMa200;

  // Thin the x-axis labels to avoid crowding
  const labelEvery = Math.max(1, Math.floor(series.length / 12));
  const visibleSeries = series.map((d, i) => ({
    ...d,
    xLabel: i % labelEvery === 0 ? d.date : '',
  }));

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-7 bg-yellow-500 rounded-full" />
        <div>
          <h2 className="text-xl font-bold text-white">Technical Analysis</h2>
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            {info.ticker} · Price Action · Moving Averages · RSI · Volume
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-400 text-sm">
          ⚠️ {error}
        </div>
      ) : (
        <>
          {/* ── Level Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            <LevelCard
              label="Current"
              value={fmtPx(metrics.currentPrice)}
              subtext={`${metrics.changePercent >= 0 ? '+' : ''}${metrics.changePercent.toFixed(2)}% today`}
              valueColor={metrics.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}
            />
            <LevelCard
              label="50-Day MA"
              value={lastMa50 !== null ? fmtPx(lastMa50) : '—'}
              subtext={lastMa50 !== null ? (metrics.currentPrice > lastMa50 ? '▲ Above' : '▼ Below') : undefined}
              valueColor={lastMa50 !== null ? (metrics.currentPrice > lastMa50 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}
            />
            <LevelCard
              label="200-Day MA"
              value={lastMa200 !== null ? fmtPx(lastMa200) : '—'}
              subtext={lastMa200 !== null ? (metrics.currentPrice > lastMa200 ? '▲ Above' : '▼ Below') : undefined}
              valueColor={lastMa200 !== null ? (metrics.currentPrice > lastMa200 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}
            />
            <LevelCard
              label="52-Week High"
              value={fmtPx(metrics.high52Week)}
              subtext={`${(((metrics.currentPrice - metrics.high52Week) / metrics.high52Week) * 100).toFixed(1)}% from ATH`}
              valueColor="text-emerald-400"
            />
            <LevelCard
              label="52-Week Low"
              value={fmtPx(metrics.low52Week)}
              subtext={`${(((metrics.currentPrice - metrics.low52Week) / metrics.low52Week) * 100).toFixed(1)}% from low`}
              valueColor="text-red-400"
            />
            <LevelCard
              label="RSI (14)"
              value={lastRsi !== null ? lastRsi.toFixed(1) : '—'}
              subtext={rsiLabel}
              valueColor={rsiColor}
            />
          </div>

          {/* ── Signal Badges ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
            <SignalBadge
              label="50-MA Signal"
              verdict={ma50Signal ? 'Bullish' : 'Bearish'}
              verdictColor={ma50Signal ? 'text-emerald-400' : 'text-red-400'}
              detail={
                lastMa50 !== null
                  ? `Price is ${ma50Signal ? 'above' : 'below'} the 50-day moving average (${fmtPx(lastMa50)}). ${ma50Signal ? 'Short-term trend is positive.' : 'Short-term momentum is weak.'}`
                  : 'Insufficient data to compute 50-day MA.'
              }
            />
            <SignalBadge
              label="200-MA Signal"
              verdict={ma200Signal ? 'Bullish' : lastMa200 === null ? 'No Data' : 'Bearish'}
              verdictColor={ma200Signal ? 'text-emerald-400' : lastMa200 === null ? 'text-slate-400' : 'text-red-400'}
              detail={
                lastMa200 !== null
                  ? `Price is ${ma200Signal ? 'above' : 'below'} the 200-day MA (${fmtPx(lastMa200)}). ${ma200Signal ? 'Long-term trend remains intact.' : 'Long-term trend is bearish.'}`
                  : 'Need 200+ daily bars to compute 200-day MA.'
              }
            />
            <SignalBadge
              label="RSI Signal"
              verdict={lastRsi === null ? '—' : lastRsi >= 70 ? 'Overbought' : lastRsi <= 30 ? 'Oversold' : 'Neutral Zone'}
              verdictColor={rsiColor}
              detail={
                lastRsi !== null
                  ? lastRsi >= 70
                    ? `RSI at ${lastRsi.toFixed(1)} — momentum is stretched. Watch for a pullback or consolidation before adding.`
                    : lastRsi <= 30
                    ? `RSI at ${lastRsi.toFixed(1)} — potentially oversold. Potential mean-reversion opportunity; confirm with price action.`
                    : `RSI at ${lastRsi.toFixed(1)} — no extremes. Trend-following signals are more reliable in this zone.`
                  : 'Insufficient data to compute RSI.'
              }
            />
            <SignalBadge
              label="S/R Levels"
              verdict={`Support: ${fmtPx(support)}`}
              verdictColor="text-cyan-400"
              detail={`60-day range support: ${fmtPx(support)} · Resistance: ${fmtPx(resistance)}. Key levels to watch for breakouts and breakdowns.`}
            />
          </div>

          {/* ── Price Chart with MAs ── */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 mb-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h4 className="text-sm font-semibold text-white">Price with Moving Averages</h4>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-6 h-0.5 bg-cyan-400 rounded" />
                  <span className="text-slate-400">Price</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-6 h-0.5 bg-orange-400 rounded" style={{ borderTop: '2px dashed #fb923c', background: 'none' }} />
                  <span className="text-slate-400">50-MA</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-6 h-0.5 bg-purple-400 rounded" style={{ borderTop: '2px dashed #a78bfa', background: 'none' }} />
                  <span className="text-slate-400">200-MA</span>
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={visibleSeries} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="xLabel"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => {
                    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                    return String(v);
                  }}
                  width={44}
                />
                <Tooltip content={<PriceTooltip currency={info.currency} />} />
                {/* Support / Resistance */}
                <ReferenceLine y={resistance} stroke="#f87171" strokeDasharray="5 5" strokeWidth={1} label={{ value: 'Res.', position: 'right', fontSize: 9, fill: '#f87171' }} />
                <ReferenceLine y={support} stroke="#4ade80" strokeDasharray="5 5" strokeWidth={1} label={{ value: 'Sup.', position: 'right', fontSize: 9, fill: '#4ade80' }} />
                {/* Price */}
                <Line type="monotone" dataKey="close" stroke="#2dd4bf" strokeWidth={2} dot={false} name="Close" />
                {/* MAs */}
                <Line type="monotone" dataKey="ma50" stroke="#fb923c" strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="50-MA" connectNulls />
                <Line type="monotone" dataKey="ma200" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="8 4" dot={false} name="200-MA" connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* ── RSI + Volume Row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* RSI Chart */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white">RSI (14-Period)</h4>
                <div className="flex gap-3 text-xs text-slate-500">
                  <span className="text-red-400">70 Overbought</span>
                  <span className="text-emerald-400">30 Oversold</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={visibleSeries} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="xLabel"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                    ticks={[0, 30, 50, 70, 100]}
                  />
                  <Tooltip content={<RsiTooltip />} />
                  <ReferenceLine y={70} stroke="#f87171" strokeDasharray="4 4" strokeWidth={1} />
                  <ReferenceLine y={50} stroke="#475569" strokeDasharray="2 4" strokeWidth={1} />
                  <ReferenceLine y={30} stroke="#4ade80" strokeDasharray="4 4" strokeWidth={1} />
                  <Line
                    type="monotone"
                    dataKey="rsi"
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                    dot={false}
                    name="rsi"
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
              {/* Current RSI pill */}
              {lastRsi !== null && (
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Current RSI</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded ${
                      lastRsi >= 70
                        ? 'bg-red-500/20 text-red-400'
                        : lastRsi <= 30
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {lastRsi.toFixed(1)} — {rsiLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Volume Chart */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white">Volume</h4>
                <div className="flex gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-2.5 rounded-sm bg-cyan-400/60" />Up day
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-2.5 rounded-sm bg-red-400/50" />Down day
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={visibleSeries} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="xLabel"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickFormatter={v => {
                      if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                      if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                      return String(v);
                    }}
                  />
                  <Tooltip content={<VolumeTooltip />} />
                  <ReferenceLine
                    y={series.reduce((s, d) => s + d.volume, 0) / series.length}
                    stroke="#475569"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    label={{ value: 'Avg', position: 'right', fontSize: 9, fill: '#64748b' }}
                  />
                  <Bar dataKey="volume" maxBarSize={10} radius={[2, 2, 0, 0]}>
                    {visibleSeries.map((entry, i) => (
                      <Cell
                        key={`vol-${i}`}
                        fill={entry.up ? 'rgba(45,212,191,0.55)' : 'rgba(248,113,113,0.45)'}
                      />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
              {/* Avg volume */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">Avg Volume</span>
                <span className="font-mono text-slate-300">
                  {metrics.avgVolume.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* ── Trend Summary ── */}
          <div className="mt-5 bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
            <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Trend Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: 'Trend (50-MA)',
                  value: lastMa50 !== null ? (metrics.currentPrice > lastMa50 ? 'Uptrend' : 'Downtrend') : 'N/A',
                  color: lastMa50 !== null ? (metrics.currentPrice > lastMa50 ? '#4ade80' : '#f87171') : '#64748b',
                },
                {
                  label: 'Trend (200-MA)',
                  value: lastMa200 !== null ? (metrics.currentPrice > lastMa200 ? 'Uptrend' : 'Downtrend') : 'Insufficient data',
                  color: lastMa200 !== null ? (metrics.currentPrice > lastMa200 ? '#4ade80' : '#f87171') : '#64748b',
                },
                {
                  label: 'Momentum (RSI)',
                  value: lastRsi !== null ? `${lastRsi.toFixed(1)} — ${rsiLabel}` : 'N/A',
                  color: lastRsi !== null ? (lastRsi >= 70 ? '#f87171' : lastRsi <= 30 ? '#4ade80' : '#fbbf24') : '#64748b',
                },
                {
                  label: 'Price vs 52W',
                  value: `${(((metrics.currentPrice - metrics.low52Week) / (metrics.high52Week - metrics.low52Week)) * 100).toFixed(0)}% of range`,
                  color: '#2dd4bf',
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <div className="text-xs text-slate-500 mb-1">{label}</div>
                  <div className="text-sm font-semibold font-mono" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-600 mt-4 text-center">
            Indicators computed from historical OHLCV data. Past price behaviour does not guarantee future results.
          </p>
        </>
      )}
    </div>
  );
}
