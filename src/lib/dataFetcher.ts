// Data fetcher for USE stocks from African Financials
// This service fetches and updates stock data daily

import { StockMetrics, USE_STOCKS } from '@/types/stock';
import { getStockDataSync } from './mockData';

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalPriceData {
  ticker: string;
  data: PriceData[];
}

// Cache for current prices (updated daily)
let priceCache: Record<string, StockMetrics> | null = null;
let lastUpdate: Date | null = null;

const COMPANY_TICKER_MAP: Record<string, string> = {
  'mtn': 'MTN',
  'mtn uganda': 'MTN',
  'airtel uganda': 'AIRTL',
  'airtel': 'AIRTL',
  'stanbic': 'SBU',
  'stanbic bank': 'SBU',
  'stanbic bank uganda': 'SBU',
  'dfcu bank': 'DFCU',
  'dfcu': 'DFCU',
  'baroda': 'BOBU',
  'bank of baroda': 'BOBU',
  'bank of baroda uganda': 'BOBU',
  'equity bank uganda': 'EBU',
  'equity bank': 'EBU',
  'uganda clays': 'UCL',
  'new vision': 'NVU',
  'new vision printing and publishing': 'NVU',
  'national insurance corporation': 'NIC',
  'bat uganda': 'BATU',
  'british american tobacco uganda': 'BATU',
  'umeme': 'UMEME',
  'qcil': 'QCIL',
  'quality chemical industries': 'QCIL',
  'quality chemicals industries': 'QCIL',
  'quality chemicals industries ltd': 'QCIL',
  'quality chemical industries ltd': 'QCIL'
};

const normalizeCompanyName = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const parseNumber = (value: string) => Number.parseFloat(value.replace(/,/g, ''));

const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

const stripTags = (value: string) =>
  decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());

const parseAfricanFinancialsHtml = (html: string) => {
  const sanitized = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');

  const rows = sanitized.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  let headerCells: string[] | null = null;
  let headerIndexes: Record<string, number> | null = null;
  let parsed: Record<string, { currentPrice: number; changePercent: number; volume: number; lastUpdated: string }> = {};

  const headerLookup = (cell: string) => stripTags(cell).toLowerCase();

  for (const row of rows) {
    const cells = Array.from(row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)).map((match) => match[1]);
    if (cells.length === 0) continue;

    if (!headerCells) {
      const normalized = cells.map(headerLookup);
      const isHeader = normalized.some((cell) => cell.includes('company')) && normalized.some((cell) => cell.includes('price'));
      if (isHeader) {
        headerCells = normalized;
        headerIndexes = {
          company: normalized.findIndex((cell) => cell.includes('company')),
          price: normalized.findIndex((cell) => cell.includes('price')),
          changePct: normalized.findIndex((cell) => cell.includes('%') && cell.includes('change')),
          volume: normalized.findIndex((cell) => cell.includes('volume')),
          updated: normalized.findIndex((cell) => cell.includes('updated') || cell.includes('date'))
        };
      }
      continue;
    }

    if (!headerIndexes) continue;

    const values = cells.map(stripTags);
    const companyRaw = values[headerIndexes.company] || '';
    const company = normalizeCompanyName(companyRaw);
    const ticker = COMPANY_TICKER_MAP[company];
    if (!ticker) continue;

    const priceText = values[headerIndexes.price] || '';
    const changeText = values[headerIndexes.changePct] || '';
    const volumeText = values[headerIndexes.volume] || '';
    const dateText = values[headerIndexes.updated] || '';

    const currentPrice = parseNumber(priceText);
    const changePercent = parseNumber(changeText);
    const volume = parseNumber(volumeText);
    const updatedDate = new Date(dateText);

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) continue;

    parsed[ticker] = {
      currentPrice,
      changePercent: Number.isFinite(changePercent) ? changePercent : 0,
      volume: Number.isFinite(volume) ? volume : 0,
      lastUpdated: Number.isNaN(updatedDate.getTime())
        ? new Date().toISOString()
        : updatedDate.toISOString()
    };
  }

  return parsed;
};

async function fetchFallbackPrices(): Promise<Record<string, StockMetrics>> {
  const fallbackUrl = process.env.AFRICAN_MARKET_FALLBACK_URL;
  if (!fallbackUrl) return {};

  const response = await fetch(fallbackUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...(process.env.AFRICAN_MARKET_FALLBACK_TOKEN
        ? { Authorization: `Bearer ${process.env.AFRICAN_MARKET_FALLBACK_TOKEN}` }
        : {})
    }
  });

  if (!response.ok) {
    throw new Error(`Fallback market source failed: ${response.status}`);
  }

  const payload = await response.json();
  const results: Record<string, StockMetrics> = {};

  if (!Array.isArray(payload)) {
    return results;
  }

  for (const entry of payload) {
    if (!entry?.ticker) continue;
    const base = getStockDataSync(entry.ticker)?.metrics;
    if (!base) continue;

    results[entry.ticker] = {
      ...base,
      currentPrice: Number(entry.currentPrice ?? base.currentPrice),
      changePercent: Number(entry.changePercent ?? base.changePercent),
      change: Number(entry.change ?? base.change),
      volume: Number(entry.volume ?? base.volume),
      lastUpdated: entry.lastUpdated ?? base.lastUpdated ?? new Date().toISOString()
    };
  }

  return results;
}

// Fetch current stock prices from African Financials
export async function fetchCurrentPrices(): Promise<Record<string, StockMetrics>> {
  // Check if cache is still valid (less than 24 hours old)
  if (priceCache && lastUpdate) {
    const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate < 24) {
      return priceCache;
    }
  }

  try {
    const response = await fetch('https://africanfinancials.com/uganda-securities-exchange-share-prices/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`African Financials request failed: ${response.status}`);
    }

    const html = await response.text();
    const parsedPrices = parseAfricanFinancialsHtml(html);

    const prices: Record<string, StockMetrics> = {};
    for (const stock of USE_STOCKS) {
      const base = getStockDataSync(stock.ticker)?.metrics;
      if (!base) continue;

      const update = parsedPrices[stock.ticker];
      if (update) {
        prices[stock.ticker] = {
          ...base,
          currentPrice: update.currentPrice,
          changePercent: update.changePercent,
          change: Number((update.currentPrice * (update.changePercent / 100)).toFixed(2)),
          volume: update.volume,
          lastUpdated: update.lastUpdated
        };
      } else {
        prices[stock.ticker] = {
          ...base,
          lastUpdated: base.lastUpdated || new Date().toISOString()
        };
      }
    }

    if (Object.keys(prices).length === 0) {
      throw new Error('No prices parsed from African Financials');
    }

    priceCache = prices;
    lastUpdate = new Date();

    return prices;
  } catch (error) {
    console.error('Error fetching prices:', error);
    try {
      const fallbackPrices = await fetchFallbackPrices();
      if (Object.keys(fallbackPrices).length > 0) {
        priceCache = fallbackPrices;
        lastUpdate = new Date();
        return fallbackPrices;
      }
    } catch (fallbackError) {
      console.error('Fallback data source failed:', fallbackError);
    }

    const mock = await getMockPricesFromSource();
    priceCache = mock;
    lastUpdate = new Date();
    return mock;
  }
}

// Mock function that simulates fetching from African Financials
// In production, replace this with actual scraping/API call
async function getMockPricesFromSource(): Promise<Record<string, StockMetrics>> {
  // This would be replaced with actual scraping logic
  // For now, return the current mock data structure
  const stocks = ['MTN', 'AIRTL', 'DFCU', 'NVU', 'UCL', 'SBU', 'BOBU', 'EBU', 'NIC', 'BATU', 'UMEME', 'QCIL'];
  
  const prices: Record<string, StockMetrics> = {};
  
  for (const ticker of stocks) {
    const stockData = getStockDataSync(ticker);
    if (stockData) {
      prices[ticker] = stockData.metrics;
    }
  }
  
  return prices;
}

// Generate historical candlestick data
export function generateHistoricalData(
  ticker: string,
  currentPrice: number,
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'
): PriceData[] {
  const now = new Date();

  let periods: number;
  let daysPerPeriod: number;

  switch (timeframe) {
    case 'daily':
      periods = 252; // ~1 year of trading days — enough for both 50-day and 200-day MAs
      daysPerPeriod = 1;
      break;
    case 'weekly':
      periods = 104; // 2 years of weekly bars
      daysPerPeriod = 7;
      break;
    case 'monthly':
      periods = 36; // 3 years of monthly bars
      daysPerPeriod = 30;
      break;
    case 'yearly':
      periods = 5;
      daysPerPeriod = 365;
      break;
  }

  const volatility = 0.015; // 1.5% per-period volatility

  // Walk BACKWARD from today so the most recent close always equals currentPrice.
  // This ensures the chart's last bar matches the "Current Price" displayed in the header.
  let price = currentPrice;
  const tempData: PriceData[] = [];

  for (let i = 0; i < periods; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * daysPerPeriod);

    const change = (Math.random() - 0.5) * volatility * price;
    const close = price;
    const open = Math.max(price - change, 0.01);
    const wick = Math.abs(change) * Math.random() * 0.5;
    const high = Math.max(open, close) + wick;
    const low = Math.max(Math.min(open, close) - wick, 0.01);
    const volume = Math.floor(Math.random() * 1_000_000 + 50_000);

    tempData.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });

    price = open; // step further back in time
  }

  // Reverse so the array is in chronological order (oldest → newest)
  return tempData.reverse();
}

// Get historical data for a stock
export async function getHistoricalData(
  ticker: string,
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'
): Promise<PriceData[]> {
  const prices = await fetchCurrentPrices();
  const currentPrice = prices[ticker]?.currentPrice || 0;
  
  if (currentPrice === 0) {
    return [];
  }
  
  return generateHistoricalData(ticker, currentPrice, timeframe);
}

// Force refresh prices (for manual updates)
export async function refreshPrices(): Promise<void> {
  priceCache = null;
  lastUpdate = null;
  await fetchCurrentPrices();
}

