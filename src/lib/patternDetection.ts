// Candlestick Pattern Detection using available technical indicator helpers
// Note: The 'technicalindicators' package does not export TA-Lib candle pattern constants like CDLDARKCLOUDCOVER.
// We use the candle pattern helpers that exist (e.g., bearishengulfingpattern, doji, etc.) and implement
// Dark Cloud Cover locally.

import * as TI from 'technicalindicators';

export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PatternDetection {
  date: string;
  patterns: {
    name: string;
    signal: 'bullish' | 'bearish' | 'neutral';
    strength: number;
  }[];
}

// Pattern definitions
const PATTERN_DEFINITIONS = {
  DOJI: { name: 'Doji', signal: 'neutral' as const, description: 'Indecision - potential reversal' },
  HAMMER: { name: 'Hammer', signal: 'bullish' as const, description: 'Bullish reversal pattern' },
  ENGULFING: { name: 'Engulfing', signal: 'bullish' as const, description: 'Strong bullish reversal' },
  MORNING_STAR: { name: 'Morning Star', signal: 'bullish' as const, description: 'Bullish reversal pattern' },
  PIERCING: { name: 'Piercing', signal: 'bullish' as const, description: 'Bullish reversal' },
  SHOOTING_STAR: { name: 'Shooting Star', signal: 'bearish' as const, description: 'Bearish reversal pattern' },
  HANGING_MAN: { name: 'Hanging Man', signal: 'bearish' as const, description: 'Bearish reversal pattern' },
  EVENING_STAR: { name: 'Evening Star', signal: 'bearish' as const, description: 'Bearish reversal pattern' },
  DARK_CLOUD: { name: 'Dark Cloud', signal: 'bearish' as const, description: 'Bearish reversal pattern' },
};

export function detectCandlestickPatterns(data: PriceData[]): PatternDetection[] {
  if (data.length < 3) {
    return [];
  }

  // Extract OHLC arrays
  const open = data.map(d => d.open);
  const high = data.map(d => d.high);
  const low = data.map(d => d.low);
  const close = data.map(d => d.close);

  // Detect patterns using available helpers and local implementations
  const patterns: PatternDetection[] = [];

  try {
    // Process each day by passing the slice up to the current index
    for (let i = 0; i < data.length; i++) {
      const detectedPatterns: PatternDetection['patterns'] = [];

      const subData = {
        open: open.slice(0, i + 1),
        high: high.slice(0, i + 1),
        low: low.slice(0, i + 1),
        close: close.slice(0, i + 1),
      };

      // Check each pattern using the exported functions from technicalindicators (where available)
      if (TI.doji && TI.doji(subData)) {
        detectedPatterns.push({ name: PATTERN_DEFINITIONS.DOJI.name, signal: PATTERN_DEFINITIONS.DOJI.signal, strength: 1 });
      }
      if (TI.hammerpattern && TI.hammerpattern(subData)) {
        detectedPatterns.push({ name: PATTERN_DEFINITIONS.HAMMER.name, signal: PATTERN_DEFINITIONS.HAMMER.signal, strength: 1 });
      }
      if (TI.bullishengulfingpattern && TI.bullishengulfingpattern(subData)) {
        detectedPatterns.push({ name: PATTERN_DEFINITIONS.ENGULFING.name, signal: 'bullish', strength: 1 });
      }
      if (TI.bearishengulfingpattern && TI.bearishengulfingpattern(subData)) {
        detectedPatterns.push({ name: PATTERN_DEFINITIONS.ENGULFING.name, signal: 'bearish', strength: 1 });
      }
      if (TI.morningstar && TI.morningstar(subData)) {
        detectedPatterns.push({ name: PATTERN_DEFINITIONS.MORNING_STAR.name, signal: PATTERN_DEFINITIONS.MORNING_STAR.signal, strength: 1 });
      }
      if (TI.piercingline && TI.piercingline(subData)) {
        detectedPatterns.push({ name: PATTERN_DEFINITIONS.PIERCING.name, signal: PATTERN_DEFINITIONS.PIERCING.signal, strength: 1 });
      }
      if (TI.shootingstar && TI.shootingstar(subData)) {
        detectedPatterns.push({ name: PATTERN_DEFINITIONS.SHOOTING_STAR.name, signal: PATTERN_DEFINITIONS.SHOOTING_STAR.signal, strength: 1 });
      }
      if (TI.hangingman && TI.hangingman(subData)) {
        detectedPatterns.push({ name: PATTERN_DEFINITIONS.HANGING_MAN.name, signal: PATTERN_DEFINITIONS.HANGING_MAN.signal, strength: 1 });
      }
      if (TI.eveningstar && TI.eveningstar(subData)) {
        detectedPatterns.push({ name: PATTERN_DEFINITIONS.EVENING_STAR.name, signal: PATTERN_DEFINITIONS.EVENING_STAR.signal, strength: 1 });
      }

      // Local Dark Cloud Cover detection (approximation):
      // Conditions for last two candles:
      // 1) First candle bullish with real body > small threshold
      // 2) Second candle opens above first candle high (gap up)
      // 3) Second candle closes into the prior real body and below the midpoint of the prior real body
      // 4) Second candle is bearish
      if (i >= 1) {
        const o1 = open[i - 1];
        const c1 = close[i - 1];
        const h1 = high[i - 1];
        const o2 = open[i];
        const c2 = close[i];
        // bullish first candle body
        const bullish1 = c1 > o1;
        const body1 = Math.abs(c1 - o1);
        const avgRange = Math.abs(high[i - 1] - low[i - 1]);
        const strongBody = body1 > 0 && body1 >= 0.3 * (avgRange || 1); // heuristic
        const gapUp = o2 > h1; // requires some gap; adjust if gaps are rare
        const midpoint1 = (o1 + c1) / 2;
        const closesIntoBody = c2 < c1 && c2 < midpoint1 && c2 > o1;
        const bearish2 = c2 < o2;
        if (bullish1 && strongBody && gapUp && closesIntoBody && bearish2) {
          detectedPatterns.push({ name: PATTERN_DEFINITIONS.DARK_CLOUD.name, signal: PATTERN_DEFINITIONS.DARK_CLOUD.signal, strength: 1 });
        }
      }

      if (detectedPatterns.length > 0) {
        patterns.push({ date: data[i].date, patterns: detectedPatterns });
      }
    }
  } catch (error) {
    console.error('Error detecting patterns:', error);
  }

  return patterns;
}

export function getPatternSummary(patterns: PatternDetection[]): {
  bullish: number;
  bearish: number;
  neutral: number;
  recent: PatternDetection[];
} {
  let bullish = 0;
  let bearish = 0;
  let neutral = 0;

  patterns.forEach(p => {
    p.patterns.forEach(pattern => {
      if (pattern.signal === 'bullish') bullish++;
      else if (pattern.signal === 'bearish') bearish++;
      else neutral++;
    });
  });

  return {
    bullish,
    bearish,
    neutral,
    recent: patterns.slice(-10) // Last 10 pattern detections
  };
}
