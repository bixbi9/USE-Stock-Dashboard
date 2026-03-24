'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
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

// Bollinger Bands: upper = SMA(20) + 2σ, lower = SMA(20) − 2σ
function bollingerBands(
  closes: number[],
  period: number,
  idx: number
): { mid: number; upper: number; lower: number } | null {
  if (idx < period - 1) return null;
  const slice = closes.slice(idx - period + 1, idx + 1);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mid) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  return { mid, upper: mid + 2 * sd, lower: mid - 2 * sd };
}

// Detect swing highs and lows (local extremes over a lookback window)
function isSwingHigh(closes: number[], idx: number, window = 5): boolean {
  const start = Math.max(0, idx - window);
  const end = Math.min(closes.length - 1, idx + window);
  for (let j = start; j <= end; j++) {
    if (j !== idx && closes[j] >= closes[idx]) return false;
  }
  return true;
}

function isSwingLow(closes: number[], idx: number, window = 5): boolean {
  const start = Math.max(0, idx - window);
  const end = Math.min(closes.length - 1, idx + window);
  for (let j = start; j <= end; j++) {
    if (j !== idx && closes[j] <= closes[idx]) return false;
  }
  return true;
}

// ── Chart tooltip ────────────────────────────────────────────────────────────

const PRICE_SHOW_KEYS = ['close', 'ma50', 'ma200', 'bbUpper', 'bbLower'];

function PriceTooltip({ active, payload, label, currency, fmtDate }: any) {
  if (!active || !payload?.length) return null;
  const fmt = (v: number) =>
    Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Find the raw candle fields from the payload (stored directly on the data point)
  const point = payload[0]?.payload;
  const displayDate = fmtDate ? fmtDate(label) : label;

  // Build ordered rows: Close → 50-MA → 200-MA → BB Upper → BB Lower
  const keyMeta: Record<string, { label: string; className: string }> = {
    close:    { label: 'Close',    className: 'text-cyan-400' },
    ma50:     { label: '50-MA',    className: 'text-orange-400' },
    ma200:    { label: '200-MA',   className: 'text-purple-400' },
    bbUpper:  { label: 'BB Upper', className: 'text-sky-400' },
    bbLower:  { label: 'BB Lower', className: 'text-sky-400' },
  };

  return (
    <div className="bg-slate-900/95 border border-slate-600 rounded-xl px-4 py-3 text-xs shadow-2xl min-w-[180px]">
      <p className="font-semibold text-slate-200 mb-2 text-sm">{displayDate}</p>
      {/* OHLC row */}
      {point && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mb-2 pb-2 border-b border-slate-700">
          <span className="text-slate-500">Open</span>
          <span className="text-right font-mono text-slate-300">{currency} {fmt(point.open)}</span>
          <span className="text-slate-500">High</span>
          <span className="text-right font-mono text-emerald-400">{currency} {fmt(point.high)}</span>
          <span className="text-slate-500">Low</span>
          <span className="text-right font-mono text-red-400">{currency} {fmt(point.low)}</span>
          <span className="text-slate-500">Close</span>
          <span className="text-right font-mono text-cyan-400 font-bold">{currency} {fmt(point.close)}</span>
        </div>
      )}
      {/* Indicator rows */}
      {PRICE_SHOW_KEYS.map(key => {
        const val = point?.[key];
        const meta = keyMeta[key];
        if (val == null || !meta) return null;
        return (
          <div key={key} className="flex justify-between gap-4">
            <span className="text-slate-500">{meta.label}</span>
            <span className={`font-mono ${meta.className}`}>
              {currency} {fmt(val)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function fmtIsoDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function RsiTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload.find((p: any) => p.dataKey === 'rsi')?.value;
  const colorClass = val >= 70 ? 'text-red-400' : val <= 30 ? 'text-emerald-400' : 'text-yellow-400';
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-slate-300 mb-1">{fmtIsoDate(label)}</p>
      {val != null && <p className={colorClass}>RSI(14): {val.toFixed(1)}</p>}
    </div>
  );
}

function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const vol = payload[0]?.value;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-slate-300 mb-1">{fmtIsoDate(label)}</p>
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
    return candles.map((c, i) => {
      const bb = bollingerBands(closes, 20, i);
      const swingHigh = isSwingHigh(closes, i, 7);
      const swingLow  = isSwingLow(closes, i, 7);
      return {
        date: c.date,          // full "YYYY-MM-DD" — used by XAxis & tooltip
        close: c.close,
        open:  c.open,
        high:  c.high,
        low:   c.low,
        volume: c.volume,
        ma50:  sma(closes, 50, i),
        ma200: sma(closes, 200, i),
        rsi:   rsi(closes, 14, i),
        up: c.close >= c.open,
        bbUpper: bb?.upper ?? null,
        bbLower: bb?.lower ?? null,
        bbMid:   bb?.mid   ?? null,
        swingHighDot: swingHigh ? c.close : null,
        swingLowDot:  swingLow  ? c.close : null,
      };
    });
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

  // Format "YYYY-MM-DD" → "Jan '25" for x-axis ticks
  const fmtAxisDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format "YYYY-MM-DD" → "15 Mar 2025" for tooltip header
  const fmtTooltipDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50 overflow-hidden">
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

          {/* ── Price Chart with MAs + Bollinger Bands ── */}
          {/* Negative horizontal margin cancels the card's p-6 so the chart spans full width */}
          <div className="bg-slate-800/60 border-y border-slate-700 -mx-6 px-6 py-5 mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h4 className="text-sm font-semibold text-white">1-Year Price Chart with Moving Averages</h4>
              <div className="flex gap-4 text-xs flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-6 h-0.5 rounded bg-cyan-400" />
                  <span className="text-slate-400">Price</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-6 border-t-2 border-dashed border-orange-400" />
                  <span className="text-slate-400">50-MA</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-6 border-t-2 border-dashed border-purple-400" />
                  <span className="text-slate-400">200-MA</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-3 rounded-sm bg-sky-400/20 border border-sky-400/40" />
                  <span className="text-slate-400">BB(20,2)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-400">Swing Low</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-slate-400">Swing High</span>
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={520}>
              <ComposedChart data={series} margin={{ top: 8, right: 28, left: 0, bottom: 24 }}>
                <defs>
                  <linearGradient id="bbFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  /* show ~one label per month (252 trading days ÷ 12 months ≈ 21) */
                  interval={20}
                  tickFormatter={fmtAxisDate}
                  angle={-35}
                  textAnchor="end"
                  height={44}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => {
                    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                    return String(v);
                  }}
                  width={48}
                />
                <Tooltip
                  content={<PriceTooltip currency={info.currency} fmtDate={fmtTooltipDate} />}
                  cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 2' }}
                />
                {/* Support / Resistance */}
                <ReferenceLine y={resistance} stroke="#f87171" strokeDasharray="5 5" strokeWidth={1} label={{ value: 'Res.', position: 'right', fontSize: 9, fill: '#f87171' }} />
                <ReferenceLine y={support} stroke="#4ade80" strokeDasharray="5 5" strokeWidth={1} label={{ value: 'Sup.', position: 'right', fontSize: 9, fill: '#4ade80' }} />
                {/* Bollinger Band fill — upper bound as top of area */}
                <Area
                  type="monotone"
                  dataKey="bbUpper"
                  stroke="#38bdf8"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                  fill="url(#bbFill)"
                  dot={false}
                  name="BB Upper"
                  connectNulls
                  legendType="none"
                  baseLine={0}
                />
                <Area
                  type="monotone"
                  dataKey="bbLower"
                  stroke="#38bdf8"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                  fill="#0f172a"
                  dot={false}
                  name="BB Lower"
                  connectNulls
                  legendType="none"
                />
                {/* Price */}
                <Line type="monotone" dataKey="close" stroke="#2dd4bf" strokeWidth={2} dot={false} name="Close" />
                {/* MAs */}
                <Line type="monotone" dataKey="ma50"  stroke="#fb923c" strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="50-MA"  connectNulls />
                <Line type="monotone" dataKey="ma200" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="8 4" dot={false} name="200-MA" connectNulls />
                {/* Swing high dots */}
                <Line
                  type="monotone"
                  dataKey="swingHighDot"
                  stroke="#f87171"
                  strokeWidth={0}
                  dot={{ r: 3, fill: '#f87171', strokeWidth: 0 }}
                  activeDot={false}
                  name="Swing High"
                  connectNulls={false}
                  legendType="none"
                />
                {/* Swing low dots */}
                <Line
                  type="monotone"
                  dataKey="swingLowDot"
                  stroke="#4ade80"
                  strokeWidth={0}
                  dot={{ r: 3, fill: '#4ade80', strokeWidth: 0 }}
                  activeDot={false}
                  name="Swing Low"
                  connectNulls={false}
                  legendType="none"
                />
              </ComposedChart>
            </ResponsiveContainer>
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
                <ComposedChart data={series} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    interval={20}
                    tickFormatter={fmtAxisDate}
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
                <ComposedChart data={series} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    interval={20}
                    tickFormatter={fmtAxisDate}
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
                    {series.map((entry, i) => (
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
