import { StockMetrics, SentimentSummary } from '@/types/stock';

export interface ForecastPoint {
  year: string;
  revenue: number;
  earnings: number;
  price: number;
}

export interface AnalysisCheck {
  label: string;
  detail: string;
  pass: boolean;
}

export interface AnalysisSummary {
  revenueGrowthPct: number;
  earningsGrowthPct: number;
  fairValue: number;
  discountPct: number;
  valueScore: number;
  healthScore: number;
  checks: AnalysisCheck[];
}

export interface PastPerformanceSummary {
  totalReturnPct: number;
  maxDrawdownPct: number;
  bestYearReturn: number;
  worstYearReturn: number;
  volatility: number;
}

export interface FinancialHealthSignal {
  label: string;
  score: number;
  detail: string;
  note: string;
}

export interface PriceTargetPoint {
  month: string;
  price: number;
  target: number;
  upside: number;
  confidence: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const seedFromMetrics = (metrics: StockMetrics) => {
  const seed =
    Math.round(metrics.currentPrice * 10) +
    Math.round(metrics.peRatio * 100) +
    Math.round(metrics.dividendYield * 1000) +
    Math.round(metrics.changePercent * 10);
  return Math.abs(seed) + 1;
};

const seededRandom = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const parseMarketCap = (marketCap: string): number => {
  const cleaned = marketCap.replace(/[^0-9.]/g, '');
  const value = Number.parseFloat(cleaned || '0');

  if (marketCap.toUpperCase().includes('T')) {
    return value * 1_000_000_000_000;
  }
  if (marketCap.toUpperCase().includes('B')) {
    return value * 1_000_000_000;
  }
  if (marketCap.toUpperCase().includes('M')) {
    return value * 1_000_000;
  }
  return value;
};

export function buildForecast(
  metrics: StockMetrics,
  sentiment: SentimentSummary
): { series: ForecastPoint[]; summary: AnalysisSummary } {
  const marketCap = parseMarketCap(metrics.marketCap);
  const baselineRevenue = marketCap > 0 ? marketCap * 0.18 : metrics.currentPrice * 1_500_000;
  const baselineEarnings = baselineRevenue * (metrics.peRatio > 0 ? 1 / metrics.peRatio : 0.08);

  const momentumBoost = clamp(metrics.changePercent / 100, -0.05, 0.08);
  const sentimentBoost = clamp(sentiment.averageScore * 0.12, -0.04, 0.06);
  const baseGrowth = clamp(0.06 + momentumBoost + sentimentBoost, 0.03, 0.22);
  const earningsGrowth = clamp(baseGrowth + 0.03, 0.05, 0.28);

  const series: ForecastPoint[] = [];
  let revenue = baselineRevenue;
  let earnings = baselineEarnings;
  let price = metrics.currentPrice;

  for (let i = 0; i <= 3; i += 1) {
    const year = new Date().getFullYear() + i;
    series.push({ year: year.toString(), revenue, earnings, price });
    revenue *= 1 + baseGrowth;
    earnings *= 1 + earningsGrowth;
    price *= 1 + earningsGrowth * 0.8;
  }

  const fairValue = metrics.currentPrice * (1 + earningsGrowth * 1.5);
  const discountPct = ((fairValue - metrics.currentPrice) / fairValue) * 100;

  const checks: AnalysisCheck[] = [
    {
      label: 'Valuation',
      detail: metrics.peRatio <= 15 ? 'Below sector P/E range' : 'Trading at premium P/E',
      pass: metrics.peRatio <= 15
    },
    {
      label: 'Dividend',
      detail: metrics.dividendYield >= 3 ? 'Yield above 3%' : 'Yield below 3%',
      pass: metrics.dividendYield >= 3
    },
    {
      label: 'Momentum',
      detail: metrics.changePercent >= 0 ? 'Positive price momentum' : 'Weak price momentum',
      pass: metrics.changePercent >= 0
    },
    {
      label: 'Fair Value',
      detail: discountPct >= 8 ? 'Estimated discount to fair value' : 'Near fair value',
      pass: discountPct >= 8
    },
    {
      label: 'Liquidity',
      detail: metrics.volume >= metrics.avgVolume * 0.75 ? 'Healthy trading volume' : 'Thin trading volume',
      pass: metrics.volume >= metrics.avgVolume * 0.75
    },
    {
      label: 'Range',
      detail: metrics.currentPrice >= metrics.low52Week * 1.1 ? 'Above 52W low' : 'Near 52W low',
      pass: metrics.currentPrice >= metrics.low52Week * 1.1
    }
  ];

  const valueScore = Math.round((checks.filter(check => check.pass).length / checks.length) * 100);
  const healthScore = Math.round(
    clamp(
      60 + metrics.dividendYield * 3 + (metrics.changePercent >= 0 ? 8 : -5),
      35,
      95
    )
  );

  return {
    series,
    summary: {
      revenueGrowthPct: baseGrowth * 100,
      earningsGrowthPct: earningsGrowth * 100,
      fairValue,
      discountPct,
      valueScore,
      healthScore,
      checks
    }
  };
}

export function buildPastPerformance(metrics: StockMetrics): {
  series: { year: string; returnPct: number; price: number; market: number }[];
  summary: PastPerformanceSummary;
} {
  const seed = seedFromMetrics(metrics);
  const rand = seededRandom(seed);

  const currentYear = new Date().getFullYear();
  const series = [];
  let price = metrics.currentPrice;
  let market = metrics.currentPrice * (0.9 + rand() * 0.2);
  let totalReturn = 0;
  let maxDrawdown = 0;
  let peak = price;
  let returns: number[] = [];

  for (let i = 4; i >= 0; i -= 1) {
    const year = (currentYear - i).toString();
    const annualReturn = clamp((rand() - 0.45) * 45, -30, 45);
    const marketReturn = clamp((rand() - 0.48) * 30, -20, 30);
    price *= 1 + annualReturn / 100;
    market *= 1 + marketReturn / 100;

    totalReturn += annualReturn;
    returns.push(annualReturn);
    peak = Math.max(peak, price);
    maxDrawdown = Math.min(maxDrawdown, ((price - peak) / peak) * 100);

    series.push({
      year,
      returnPct: annualReturn,
      price: Number(price.toFixed(2)),
      market: Number(market.toFixed(2))
    });
  }

  const bestYearReturn = Math.max(...returns);
  const worstYearReturn = Math.min(...returns);
  const avgReturn = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const volatility = Math.sqrt(
    returns.reduce((sum, value) => sum + Math.pow(value - avgReturn, 2), 0) / returns.length
  );

  return {
    series,
    summary: {
      totalReturnPct: totalReturn,
      maxDrawdownPct: maxDrawdown,
      bestYearReturn,
      worstYearReturn,
      volatility
    }
  };
}

export function buildFinancialHealth(metrics: StockMetrics): { score: number; signals: FinancialHealthSignal[] } {
  const liquidity = clamp(65 + metrics.dividendYield * 4 - metrics.changePercent, 35, 95);
  const leverage = clamp(70 - metrics.peRatio * 2 + metrics.changePercent * 1.2, 30, 90);
  const runway = clamp(60 + metrics.currentPrice / 50 - metrics.changePercent, 30, 95);
  const efficiency = clamp(55 + metrics.dividendYield * 3 + metrics.changePercent, 25, 90);
  const coverage = clamp(58 + metrics.peRatio * 1.2, 30, 95);

  const signals: FinancialHealthSignal[] = [
    {
      label: 'Liquidity',
      score: liquidity,
      detail: liquidity >= 65 ? 'Strong short-term cover' : 'Watch near-term cash',
      note: 'Quick ratio & cash buffer'
    },
    {
      label: 'Leverage',
      score: leverage,
      detail: leverage >= 60 ? 'Balanced debt load' : 'Leverage elevated',
      note: 'Debt to equity proxy'
    },
    {
      label: 'Runway',
      score: runway,
      detail: runway >= 65 ? 'Healthy cash runway' : 'Limited cash runway',
      note: 'Years of coverage'
    },
    {
      label: 'Efficiency',
      score: efficiency,
      detail: efficiency >= 60 ? 'Operationally efficient' : 'Margins under pressure',
      note: 'Operating margin proxy'
    },
    {
      label: 'Coverage',
      score: coverage,
      detail: coverage >= 60 ? 'Interest cover solid' : 'Interest cover thin',
      note: 'EBIT/interest proxy'
    }
  ];

  const score = Math.round(signals.reduce((sum, item) => sum + item.score, 0) / signals.length);
  return { score, signals };
}

export function buildPriceTargetHistory(
  metrics: StockMetrics,
  sentiment: SentimentSummary
): PriceTargetPoint[] {
  const seed = seedFromMetrics(metrics);
  const rand = seededRandom(seed + 13);
  const points: PriceTargetPoint[] = [];
  const baseTarget = metrics.currentPrice * (1 + clamp(sentiment.averageScore * 0.4, -0.08, 0.15));

  for (let i = 5; i >= 0; i -= 1) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - i);
    const month = monthDate.toLocaleString('en-US', { month: 'short' });
    const drift = (rand() - 0.4) * 0.08;
    const target = baseTarget * (1 + drift);
    const price = metrics.currentPrice * (1 + (rand() - 0.5) * 0.06);
    const upside = ((target - price) / price) * 100;
    const confidence = clamp(55 + sentiment.confidence * 0.4 + (rand() - 0.5) * 8, 40, 90);

    points.push({
      month,
      price: Number(price.toFixed(2)),
      target: Number(target.toFixed(2)),
      upside,
      confidence
    });
  }

  return points;
}
