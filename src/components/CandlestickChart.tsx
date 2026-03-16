'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PatternMarker {
  date: string;
  patterns: {
    name: string;
    signal: 'bullish' | 'bearish' | 'neutral';
    strength: number;
  }[];
}

interface CandlestickChartProps {
  ticker: string;
  data: PriceData[];
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly';
  patterns?: PatternMarker[];
}

export default function CandlestickChart({ ticker, data, timeframe, patterns = [] }: CandlestickChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl p-8 text-center">
        <p className="text-slate-400">No data available</p>
      </div>
    );
  }
  
  // Calculate dimensions
  const width = 1000;
  const height = 400;
  const padding = { top: 20, right: 40, bottom: 60, left: 80 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Calculate price range
  const allPrices = data.flatMap(d => [d.high, d.low]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.1;
  const yMin = minPrice - pricePadding;
  const yMax = maxPrice + pricePadding;
  
  // Calculate x positions
  const candleWidth = chartWidth / data.length * 0.7;
  const candleSpacing = chartWidth / data.length;
  
  // Y scale function
  const yScale = (price: number) => {
    return padding.top + chartHeight - ((price - yMin) / (yMax - yMin)) * chartHeight;
  };
  
  // Format date
  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    switch (timeframe) {
      case 'daily':
        return format(date, 'MMM dd');
      case 'weekly':
        return format(date, 'MMM dd');
      case 'monthly':
        return format(date, 'MMM yyyy');
      case 'yearly':
        return format(date, 'yyyy');
      default:
        return format(date, 'MMM dd');
    }
  };
  
  // Generate Y-axis ticks
  const yTicks = 5;
  const tickValues: number[] = [];
  for (let i = 0; i <= yTicks; i++) {
    tickValues.push(yMin + (yMax - yMin) * (i / yTicks));
  }
  
  // Current price info
  const current = data[data.length - 1];
  const first = data[0];
  const change = current.close - first.close;
  const changePercent = (change / first.close) * 100;
  
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">{ticker} Candlestick Chart</h3>
          <p className="text-slate-400 text-sm capitalize">{timeframe} view</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
            <span className="text-xs text-slate-400">Bullish</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-xs text-slate-400">Bearish</span>
          </div>
        </div>
      </div>
      
      {/* Chart SVG */}
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="w-full">
          {/* Grid lines */}
          {tickValues.map((value, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={yScale(value)}
                x2={width - padding.right}
                y2={yScale(value)}
                stroke="#334155"
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.3}
              />
            </g>
          ))}
          
          {/* Pattern markers */}
          {patterns.map((patternMarker, pIdx) => {
            const dataIndex = data.findIndex(d => d.date === patternMarker.date);
            if (dataIndex === -1) return null;
            
            const x = padding.left + dataIndex * candleSpacing + candleSpacing / 2;
            const candle = data[dataIndex];
            const hasBullish = patternMarker.patterns.some(p => p.signal === 'bullish');
            const hasBearish = patternMarker.patterns.some(p => p.signal === 'bearish');
            
            return (
              <g key={`pattern-${pIdx}`}>
                {/* Pattern indicator above candle */}
                {(hasBullish || hasBearish) && (
                  <circle
                    cx={x}
                    cy={yScale(candle.high) - 8}
                    r={4}
                    fill={hasBullish ? '#10b981' : '#ef4444'}
                    stroke="#fff"
                    strokeWidth={1}
                    opacity={0.9}
                  />
                )}
                {/* Pattern indicator below candle for neutral */}
                {patternMarker.patterns.some(p => p.signal === 'neutral') && (
                  <circle
                    cx={x}
                    cy={yScale(candle.low) + 8}
                    r={4}
                    fill="#eab308"
                    stroke="#fff"
                    strokeWidth={1}
                    opacity={0.9}
                  />
                )}
              </g>
            );
          })}
          
          {/* Candlesticks */}
          {data.map((candle, index) => {
            const x = padding.left + index * candleSpacing + candleSpacing / 2;
            const isBullish = candle.close >= candle.open;
            const bodyTop = Math.max(candle.open, candle.close);
            const bodyBottom = Math.min(candle.open, candle.close);
            const bodyHeight = Math.abs(bodyTop - bodyBottom);
            const bodyY = yScale(bodyTop);
            const bodyHeightPx = Math.max(yScale(bodyBottom) - yScale(bodyTop), 1);
            
            const isHovered = hoveredIndex === index;
            const color = isBullish ? '#10b981' : '#ef4444';
            const darkColor = isBullish ? '#059669' : '#dc2626';
            
            // Check if this candle has patterns
            const candlePatterns = patterns.find(p => p.date === candle.date);
            
            return (
              <g
                key={index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Wick (high-low line) */}
                <line
                  x1={x}
                  y1={yScale(candle.high)}
                  x2={x}
                  y2={yScale(candle.low)}
                  stroke={isHovered ? darkColor : color}
                  strokeWidth={isHovered ? 2 : candlePatterns ? 2 : 1}
                />
                {/* Body (open-close rectangle) */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyY}
                  width={candleWidth}
                  height={Math.max(bodyHeightPx, 2)}
                  fill={isHovered ? darkColor : color}
                  stroke={darkColor}
                  strokeWidth={isHovered ? 2 : candlePatterns ? 2 : 1}
                  opacity={isHovered ? 1 : candlePatterns ? 0.95 : 0.9}
                />
              </g>
            );
          })}
          
          {/* Y-axis labels */}
          {tickValues.map((value, i) => (
            <text
              key={i}
              x={padding.left - 10}
              y={yScale(value)}
              fill="#94a3b8"
              fontSize="12"
              textAnchor="end"
              alignmentBaseline="middle"
            >
              {value.toFixed(0)}
            </text>
          ))}
          
          {/* X-axis labels */}
          {data.map((candle, index) => {
            if (index % Math.ceil(data.length / 8) !== 0 && index !== data.length - 1) return null;
            const x = padding.left + index * candleSpacing + candleSpacing / 2;
            return (
              <text
                key={index}
                x={x}
                y={height - padding.bottom + 20}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
                transform={`rotate(-45 ${x} ${height - padding.bottom + 20})`}
              >
                {formatDate(candle.date)}
              </text>
            );
          })}
          
          {/* Hover tooltip */}
          {hoveredIndex !== null && (
            <g>
              <rect
                x={padding.left + hoveredIndex * candleSpacing + candleSpacing / 2 - candleWidth / 2 - 5}
                y={padding.top - 5}
                width={candleWidth + 10}
                height={chartHeight + 10}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <g transform={`translate(${padding.left + hoveredIndex * candleSpacing + candleSpacing / 2}, ${padding.top - 10})`}>
                <rect
                  x={-80}
                  y={-80}
                  width={160}
                  height={75}
                  fill="#1e293b"
                  stroke="#334155"
                  strokeWidth={1}
                  rx={4}
                />
                <text x={0} y={-60} fill="#94a3b8" fontSize="11" textAnchor="middle">
                  {formatDate(data[hoveredIndex].date)}
                </text>
                <text x={-70} y={-45} fill="#94a3b8" fontSize="10" textAnchor="start">O:</text>
                <text x={-50} y={-45} fill="#fff" fontSize="10" textAnchor="start">{data[hoveredIndex].open.toFixed(2)}</text>
                <text x={-70} y={-30} fill="#10b981" fontSize="10" textAnchor="start">H:</text>
                <text x={-50} y={-30} fill="#10b981" fontSize="10" textAnchor="start">{data[hoveredIndex].high.toFixed(2)}</text>
                <text x={-70} y={-15} fill="#ef4444" fontSize="10" textAnchor="start">L:</text>
                <text x={-50} y={-15} fill="#ef4444" fontSize="10" textAnchor="start">{data[hoveredIndex].low.toFixed(2)}</text>
                <text x={-70} y={0} fill="#94a3b8" fontSize="10" textAnchor="start">C:</text>
                <text x={-50} y={0} fill="#fff" fontSize="10" textAnchor="start">{data[hoveredIndex].close.toFixed(2)}</text>
                {/* Pattern info in tooltip */}
                {(() => {
                  const hoveredPatterns = patterns.find(p => p.date === data[hoveredIndex].date);
                  if (hoveredPatterns && hoveredPatterns.patterns.length > 0) {
                    return (
                      <>
                        <line x1={-80} y1={10} x2={80} y2={10} stroke="#334155" strokeWidth={1} />
                        <text x={0} y={25} fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">
                          Patterns:
                        </text>
                        {hoveredPatterns.patterns.map((p, pIdx) => (
                          <text
                            key={pIdx}
                            x={0}
                            y={40 + pIdx * 12}
                            fill={p.signal === 'bullish' ? '#10b981' : p.signal === 'bearish' ? '#ef4444' : '#eab308'}
                            fontSize="9"
                            textAnchor="middle"
                          >
                            {p.name}
                          </text>
                        ))}
                      </>
                    );
                  }
                  return null;
                })()}
              </g>
            </g>
          )}
        </svg>
      </div>
      
      {/* Price statistics */}
      <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/50">
        <div>
          <div className="text-slate-400 text-xs mb-1">Current Price</div>
          <div className="text-white font-semibold text-lg">{current.close.toFixed(2)} UGX</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs mb-1">Period High</div>
          <div className="text-emerald-400 font-semibold">{maxPrice.toFixed(2)} UGX</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs mb-1">Period Low</div>
          <div className="text-red-400 font-semibold">{minPrice.toFixed(2)} UGX</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs mb-1">Period Change</div>
          <div className={`font-semibold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)} UGX
            <br />
            <span className="text-sm">({change >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
