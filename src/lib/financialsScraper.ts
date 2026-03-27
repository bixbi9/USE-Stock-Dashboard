import { USE_STOCKS, FinancialDocument, FinancialFigure } from '@/types/stock';
import { getCachedFinancials, setCachedFinancials } from './redis';

export interface FinancialsSnapshot {
  updatedAt: string;
  sourceUrl: string;
  byTicker: Record<string, FinancialDocument[]>;
  missingTickers: string[];
}

const SOURCE_URL = 'https://africanfinancials.com/uganda-listed-company-documents/';
const MAX_PAGES = 6;
const FINANCIALS_CACHE_TTL_HOURS = 24;

const AFRICAN_TICKER_MAP: Record<string, string> = {
  MTN: 'MTN',
  AIRT: 'AIRTL',
  AIRTL: 'AIRTL',
  SBU: 'SBU',
  DFCU: 'DFCU',
  BOBU: 'BOBU',
  EBL: 'EBU',
  EQTY: 'EBU',
  UCL: 'UCL',
  NVL: 'NVU',
  NIC: 'NIC',
  BATU: 'BATU',
  UMEME: 'UMEME',
  QCIL: 'QCIL',
};

const COMPANY_ALIASES: Record<string, string[]> = {
  MTN: ['mtn', 'mtn uganda', 'mtn uganda limited'],
  AIRTL: ['airtel', 'airtel uganda', 'airtel uganda limited'],
  SBU: ['stanbic', 'stanbic bank uganda', 'stanbic bank'],
  DFCU: ['dfcu', 'dfcu bank', 'dfcu bank limited'],
  BOBU: ['baroda', 'bank of baroda', 'bank of baroda uganda'],
  EBU: ['equity bank', 'equity bank uganda', 'equity bank limited', 'equity group'],
  UCL: ['uganda clays', 'uganda clays limited'],
  NVU: ['new vision', 'new vision printing and publishing', 'new vision printing and publishing company ltd'],
  NIC: ['national insurance', 'national insurance corporation', 'nic holdings'],
  BATU: ['bat uganda', 'british american tobacco uganda', 'british american tobacco'],
  UMEME: ['umeme', 'umeme limited'],
  QCIL: ['quality chemicals', 'quality chemicals industries', 'quality chemicals industries ltd', 'qcil'],
};

const FETCH_OPTS: RequestInit = {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
  ...(typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
    ? { signal: (AbortSignal as any).timeout(8_000) }
    : {}),
};

let financialsCache: FinancialsSnapshot | null = null;
let lastUpdate: Date | null = null;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

const stripTags = (value: string) =>
  decodeEntities(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());

const isFresh = (maxHours = FINANCIALS_CACHE_TTL_HOURS) =>
  !!lastUpdate && (Date.now() - lastUpdate.getTime()) / 3_600_000 < maxHours;

const mapTicker = (sourceTicker: string | undefined, companyName: string) => {
  if (sourceTicker) {
    const mapped = AFRICAN_TICKER_MAP[sourceTicker.toUpperCase()];
    if (mapped) return mapped;
  }

  const normalizedCompany = normalize(companyName);
  for (const stock of USE_STOCKS) {
    const aliases = COMPANY_ALIASES[stock.ticker] ?? [stock.name];
    if (aliases.some(a => normalize(a) === normalizedCompany || normalizedCompany.includes(normalize(a)))) {
      return stock.ticker;
    }
  }

  return null;
};

const parsePublishedDate = (value: string | undefined) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

function parseFigures(summary: string): FinancialFigure[] {
  const results: FinancialFigure[] = [];
  const pattern = /([A-Za-z][A-Za-z \-()\/]{2,40}):\s*(Ushs?|Shs|UGX|Kshs|KES|USD)?\s*([\d,.]+)\s*(trillion|billion|million|bn|m|k)?/gi;

  for (const match of summary.matchAll(pattern)) {
    const label = match[1].trim();
    const currencyRaw = match[2]?.trim();
    const rawValue = match[3]?.replace(/,/g, '');
    const unit = match[4]?.toLowerCase();
    const value = rawValue ? Number.parseFloat(rawValue) : null;

    results.push({
      label,
      value: Number.isFinite(value as number) ? (value as number) : null,
      currency: currencyRaw ? currencyRaw.toUpperCase().replace('USHS', 'UGX').replace('SHS', 'UGX') : undefined,
      unit,
      raw: match[0].trim(),
    });
  }

  return results;
}

function extractDocumentBlocks(html: string): { title: string; url: string; block: string }[] {
  const matches = [...html.matchAll(/<h[23][^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h[23]>/gi)];
  if (matches.length === 0) return [];

  const results: { title: string; url: string; block: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const nextStart = matches[i + 1]?.index ?? html.length;
    const title = stripTags(match[2]);
    if (!/\([A-Z0-9]+\.ug\)/i.test(title)) continue;
    const url = match[1];
    const block = html.slice(end, nextStart);
    results.push({ title, url, block });
  }

  return results;
}

function extractDocumentsFromHtml(html: string): Omit<FinancialDocument, 'ticker'>[] {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const blocks = extractDocumentBlocks(clean);

  const results: Omit<FinancialDocument, 'ticker'>[] = [];

  const fallbackMatches =
    blocks.length === 0
      ? [...clean.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*\([A-Z0-9]+\.ug\)[^<]*)<\/a>/gi)]
      : [];

  if (blocks.length === 0) {
    for (const match of fallbackMatches) {
      const title = stripTags(match[2]);
      if (!/(report|presentation|circular|prospectus)/i.test(title)) continue;
      const url = match[1];
      const idx = match.index ?? 0;
      const block = clean.slice(idx, idx + 1200);
      blocks.push({ title, url, block });
    }
  }

  for (const { title, url, block } of blocks) {
    const sourceTicker = title.match(/\(([A-Z0-9]+)\.ug\)/i)?.[1]?.toUpperCase();
    const company = title.split('(')[0].trim();
    const text = stripTags(block);
    const [summaryRaw, metaRaw] = text.split(/Document type:/i);
    const summary = (summaryRaw || '').replace(/\s+/g, ' ').trim();

    const meta = metaRaw ?? '';
    const docType = meta.match(/^\s*([^P]+?)\s*Published:/i)?.[1]?.trim()
      ?? meta.match(/^\s*([^Y]+?)\s*Year:/i)?.[1]?.trim();
    const publishedRaw = meta.match(/Published:\s*([A-Za-z]{3}\s+\d{1,2},\s+\d{4})/i)?.[1];
    const year = meta.match(/Year:\s*(\d{4})/i)?.[1];
    const period = meta.match(/Period:\s*([A-Z0-9]+)/i)?.[1];
    const sector = meta.match(/Period:\s*[A-Z0-9]+\s*([A-Za-z &/]+)\s*\|\s*Uganda/i)?.[1]?.trim();

    results.push({
      company: company || 'Unknown',
      title,
      url,
      summary: summary.slice(0, 700),
      documentType: docType,
      publishedAt: parsePublishedDate(publishedRaw),
      year: year ? Number.parseInt(year, 10) : undefined,
      period,
      sector,
      figures: parseFigures(summary),
      source: 'AfricanFinancials',
      sourceTicker,
    });
  }

  return results;
}

async function fetchAllDocuments(): Promise<Omit<FinancialDocument, 'ticker'>[]> {
  const allDocs: Omit<FinancialDocument, 'ticker'>[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? SOURCE_URL : `${SOURCE_URL}page/${page}/`;
    const res = await fetch(url, FETCH_OPTS);
    if (!res.ok) break;

    const html = await res.text();
    const docs = extractDocumentsFromHtml(html);
    let newCount = 0;

    for (const doc of docs) {
      if (!doc.url || seen.has(doc.url)) continue;
      seen.add(doc.url);
      allDocs.push(doc);
      newCount++;
    }

    if (docs.length === 0 || newCount === 0) break;
  }

  return allDocs;
}

export async function refreshFinancials(): Promise<FinancialsSnapshot> {
  const byTicker: Record<string, FinancialDocument[]> = Object.fromEntries(
    USE_STOCKS.map(s => [s.ticker, []])
  );

  const docs = await fetchAllDocuments();
  if (docs.length === 0) {
    throw new Error('No financial documents parsed from African Financials');
  }

  for (const doc of docs) {
    const mappedTicker = mapTicker(doc.sourceTicker, doc.company);
    if (!mappedTicker) continue;
    byTicker[mappedTicker].push({ ...doc, ticker: mappedTicker });
  }

  for (const t of Object.keys(byTicker)) {
    byTicker[t].sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  const missingTickers = USE_STOCKS
    .map(s => s.ticker)
    .filter(t => byTicker[t].length === 0);

  const snapshot: FinancialsSnapshot = {
    updatedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    byTicker,
    missingTickers,
  };

  financialsCache = snapshot;
  lastUpdate = new Date();

  await setCachedFinancials(snapshot);
  return snapshot;
}

export async function getFinancialsSnapshot(): Promise<FinancialsSnapshot | null> {
  if (financialsCache && isFresh()) return financialsCache;

  const cached = await getCachedFinancials<FinancialsSnapshot>();
  if (cached?.updatedAt) {
    financialsCache = cached;
    lastUpdate = new Date(cached.updatedAt);
  }

  if (financialsCache && isFresh()) return financialsCache;

  try {
    return await refreshFinancials();
  } catch (err) {
    console.error('[financialsScraper] Refresh failed:', err);
    return financialsCache;
  }
}

export async function getFinancialsForTicker(ticker: string): Promise<FinancialDocument[]> {
  const snapshot = await getFinancialsSnapshot();
  return snapshot?.byTicker?.[ticker] ?? [];
}

export function isFinancialsCacheFresh(maxHours = FINANCIALS_CACHE_TTL_HOURS) {
  return isFresh(maxHours);
}
