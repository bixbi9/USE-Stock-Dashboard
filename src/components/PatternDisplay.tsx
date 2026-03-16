'use client';

import { PatternDetection } from '@/lib/patternDetection';
import { format, parseISO } from 'date-fns';

interface PatternDisplayProps {
  patterns: PatternDetection[];
  patternSummary: {
    bullish: number;
    bearish: number;
    neutral: number;
    recent: PatternDetection[];
  };
}

export default function PatternDisplay({ patterns, patternSummary }: PatternDisplayProps) {
  if (patterns.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
        <h3 className="text-lg font-bold text-white mb-4">Candlestick Pattern Recognition</h3>
        <p className="text-slate-400 text-sm">No patterns detected in the current timeframe.</p>
      </div>
    );
  }

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'bullish':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'bearish':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      default:
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'bullish':
        return '📈';
      case 'bearish':
        return '📉';
      default:
        return '➡️';
    }
  };

  // Pattern explanation knowledge base with simple alias matching
  type PatternExplanation = {
    title: string;
    signal: 'bullish' | 'bearish' | 'neutral';
    description: string;
    reveals: string;
    confirmation: string;
    reliability: string;
    aliases: string[]; // case-insensitive matching
  };

  const PATTERN_EXPLANATIONS: PatternExplanation[] = [
    {
      title: 'Hammer',
      signal: 'bullish',
      description:
        'Small real body at the top with a long lower shadow after a decline. Shows sellers pushed price down intraday but buyers recovered by close.',
      reveals:
        'Potential bullish reversal as demand emerges near lows. Often marks exhaustion of downtrends or pullbacks.',
      confirmation:
        'Look for a higher close on the next candle and rising volume. Stronger if at support or oversold momentum (e.g., RSI < 30).',
      reliability: 'Moderate. Improves with trend context and confirmation.',
      aliases: ['hammer'],
    },
    {
      title: 'Hanging Man',
      signal: 'bearish',
      description:
        'Same shape as a hammer but appears after an advance. Long lower shadow signals intraday selling pressure near the top of an up-move.',
      reveals: 'Potential bearish reversal as buyers show fatigue at higher prices.',
      confirmation:
        'A lower close next candle, ideally with volume. Confluence with resistance increases odds.',
      reliability: 'Moderate. Needs confirmation.',
      aliases: ['hanging man'],
    },
    {
      title: 'Shooting Star',
      signal: 'bearish',
      description:
        'Small real body near the low with a long upper shadow after a rally. Buyers lost control into the close.',
      reveals:
        'Potential bearish reversal or pause near resistance as supply overwhelms demand at highs.',
      confirmation:
        'Follow-through selling next candle. Diverging momentum (e.g., RSI) strengthens the signal.',
      reliability: 'Moderate to high at key resistance.',
      aliases: ['shooting star'],
    },
    {
      title: 'Bullish Engulfing',
      signal: 'bullish',
      description:
        'Up candle fully engulfs the prior down candle’s real body after a decline.',
      reveals:
        'Shift from selling to buying pressure, often marking the start of a rebound.',
      confirmation:
        'Continuation higher next session and increased volume. Stronger at support or after extended declines.',
      reliability: 'High when combined with trend and support.',
      aliases: ['bullish engulfing', 'engulfing bullish'],
    },
    {
      title: 'Bearish Engulfing',
      signal: 'bearish',
      description:
        'Down candle fully engulfs the prior up candle’s real body after a rally.',
      reveals:
        'Momentum shift to sellers, suggesting a potential top or deeper pullback.',
      confirmation:
        'Lower close next candle, ideally with volume spike. Stronger near resistance or after extended uptrends.',
      reliability: 'High with confluence.',
      aliases: ['bearish engulfing', 'engulfing bearish'],
    },
    {
      title: 'Morning Star',
      signal: 'bullish',
      description:
        'Three-candle reversal: large down candle, small indecisive candle, then strong up candle closing into the first candle’s body.',
      reveals: 'Transition from selling to buying pressure at swing lows.',
      confirmation:
        'Third candle close into/above the first candle’s body; follow-through next session.',
      reliability: 'High when at support.',
      aliases: ['morning star'],
    },
    {
      title: 'Evening Star',
      signal: 'bearish',
      description:
        'Mirror of Morning Star at highs: up candle, small indecisive candle, then strong down candle closing into the first candle’s body.',
      reveals: 'Buying pressure fades and sellers take control near highs.',
      confirmation:
        'Third candle close into/through first body; continued weakness next session.',
      reliability: 'High near resistance.',
      aliases: ['evening star'],
    },
    {
      title: 'Piercing Pattern',
      signal: 'bullish',
      description:
        'After a down candle, the next opens lower but closes above the midpoint of the prior candle’s body.',
      reveals: 'Buyers stepping in aggressively, often preceding further upside.',
      confirmation: 'Close above prior high within 1–2 sessions improves odds.',
      reliability: 'Moderate.',
      aliases: ['piercing', 'piercing pattern'],
    },
    {
      title: 'Dark Cloud Cover',
      signal: 'bearish',
      description:
        'After an up candle, the next opens higher but closes below the midpoint of the prior candle’s body.',
      reveals:
        'Sellers push price down despite a strong open, signaling potential top.',
      confirmation: 'Close below prior low within 1–2 sessions. Volume adds weight.',
      reliability: 'Moderate.',
      aliases: ['dark cloud', 'dark cloud cover'],
    },
    {
      title: 'Doji',
      signal: 'neutral',
      description:
        'Open and close are near equal, indicating indecision. Impact depends on context (trend, location, volume).',
      reveals:
        'Potential pause; can precede reversals after extended moves or mark consolidation.',
      confirmation:
        'Subsequent breakout direction provides the signal. Watch for support/resistance context.',
      reliability: 'Context-dependent.',
      aliases: ['doji'],
    },
  ];

  const normalize = (s: string) => s.trim().toLowerCase();
  const findExplanation = (name: string): PatternExplanation | undefined => {
    const n = normalize(name);
    // try exact alias match
    let match = PATTERN_EXPLANATIONS.find((pe) => pe.aliases.some((a) => normalize(a) === n));
    if (match) return match;
    // try contains
    return PATTERN_EXPLANATIONS.find((pe) => pe.aliases.some((a) => n.includes(normalize(a))));
  };

  // Collect unique detected pattern names from recent summary
  const detectedPatternNames = Array.from(
    new Set((patternSummary.recent || []).flatMap((r) => r.patterns.map((p) => p.name)).filter(Boolean))
  );

  // Build explanations for detected patterns, fallback to generic if not found
  const detectedExplanations: PatternExplanation[] = detectedPatternNames
    .map((n) => findExplanation(n))
    .filter((x): x is PatternExplanation => Boolean(x));

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      <h3 className="text-lg font-bold text-white mb-6">Candlestick Pattern Recognition (TA-Lib)</h3>
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="text-slate-400 text-xs mb-1">Bullish Patterns</div>
          <div className="text-emerald-400 font-bold text-2xl">{patternSummary.bullish}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="text-slate-400 text-xs mb-1">Bearish Patterns</div>
          <div className="text-red-400 font-bold text-2xl">{patternSummary.bearish}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="text-slate-400 text-xs mb-1">Neutral Patterns</div>
          <div className="text-yellow-400 font-bold text-2xl">{patternSummary.neutral}</div>
        </div>
      </div>

      {/* Recent Patterns */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3">Recent Pattern Detections</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {patternSummary.recent
            .slice()
            .reverse()
            .map((pattern, idx) => (
              <div
                key={idx}
                className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30 hover:border-slate-600/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-xs">{format(parseISO(pattern.date), 'MMM dd, yyyy')}</span>
                  <span className="text-slate-500 text-xs">
                    {pattern.patterns.length} pattern{pattern.patterns.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pattern.patterns.map((p, pIdx) => (
                    <div
                      key={pIdx}
                      className={`px-2 py-1 rounded text-xs font-medium border ${getSignalColor(p.signal)}`}
                    >
                      <span className="mr-1">{getSignalIcon(p.signal)}</span>
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Pattern Explanations */}
      <div className="mt-6 pt-6 border-t border-slate-700/50">
        <h4 className="text-sm font-semibold text-slate-300 mb-4">Candlestick Pattern Explanations</h4>

        {detectedExplanations.length === 0 ? (
          <div className="text-xs text-slate-400">No recognized patterns to explain in the current view.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {detectedExplanations.map((exp, i) => (
              <div
                key={i}
                className="group relative rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-900/80 to-slate-800/60 p-4 shadow-lg hover:shadow-xl transition-all hover:border-slate-600/60"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="text-lg">
                      {exp.signal === 'bullish' ? '📈' : exp.signal === 'bearish' ? '📉' : '⚖️'}
                    </div>
                    <h5 className="font-semibold text-slate-200">{exp.title}</h5>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                      exp.signal === 'bullish'
                        ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
                        : exp.signal === 'bearish'
                        ? 'text-red-400 bg-red-400/10 border-red-400/30'
                        : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
                    }`}
                  >
                    {exp.signal}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-3">{exp.description}</p>

                <div className="space-y-2">
                  <div className="bg-slate-800/40 rounded-md p-2 border border-slate-700/50">
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">What it may reveal</div>
                    <div className="text-xs text-slate-200">{exp.reveals}</div>
                  </div>
                  <div className="bg-slate-800/40 rounded-md p-2 border border-slate-700/50">
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Confirmation tips</div>
                    <div className="text-xs text-slate-200">{exp.confirmation}</div>
                  </div>
                  <div className="bg-slate-800/40 rounded-md p-2 border border-slate-700/50">
                    <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Reliability</div>
                    <div className="text-xs text-slate-200">{exp.reliability}</div>
                  </div>
                </div>

                <div
                  className="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background:
                      'radial-gradient(600px circle at var(--x,50%) var(--y,50%), rgba(99,102,241,0.08), transparent 40%)',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
