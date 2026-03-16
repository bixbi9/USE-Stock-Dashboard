'use client';

import { StockInfo, StockMetrics } from '@/types/stock';

interface Props {
  info: StockInfo;
  metrics: StockMetrics;
}

type Verdict = 'buy' | 'hold' | 'sell';

interface WatchlistEntry {
  ticker: string;
  name: string;
  sector: string;
  priceLabel: string;
  verdict: Verdict;
  peRatio: number;
  dividendYield: number;
  marketCap: string;
  revGrowth: string;
  thesis: string;
  concerns: string;
  reasoning: string;
}

const WATCHLIST: WatchlistEntry[] = [
  {
    ticker: 'MTN',
    name: 'MTN Uganda Limited',
    sector: 'Telecommunications',
    priceLabel: 'UGX 315',
    verdict: 'buy',
    peRatio: 13.2,
    dividendYield: 7.2,
    marketCap: 'UGX 7.1T',
    revGrowth: '+12.3%',
    thesis: 'Mobile money (MoMo) growth is the key value driver. Fintech revenue expanding beyond core voice/data. Rural subscriber rollout unlocking new markets across Uganda and beyond.',
    concerns: 'Regulatory risk around mobile money transaction fees. ARPU compression in saturated urban markets. Rising capex for infrastructure investment cycle.',
    reasoning: 'Best-in-class mobile money ecosystem with a strong dividend yield (7.2%; FY2024 total UGX 22.60/share across 3 tranches). MoMo optionality is underpriced at current P/E of 13.2x.',
  },
  {
    ticker: 'SBU',
    name: 'Stanbic Bank Uganda',
    sector: 'Banking',
    priceLabel: 'UGX 60',
    verdict: 'buy',
    peRatio: 7.2,
    dividendYield: 9.7,
    marketCap: 'UGX 3.1T',
    revGrowth: '+15.2%',
    thesis: 'Standard Bank Group backing provides scale, deep systems, and capital strength. Strong corporate banking franchise. Oil & gas pipeline financing creates a differentiated and high-margin revenue stream from 2026.',
    concerns: 'NPL risk in SME loan book. BOU regulatory compliance costs rising. Mobile money eroding retail fee income across the system.',
    reasoning: 'P/E of 7.2x with above-average loan book growth. Oil sector linkage provides a structural 2026+ catalyst. Strong dividend yield of 9.7% (FY2024: UGX 5.86/share — UGX 2.73 interim + UGX 3.13 final) supports total return thesis.',
  },
  {
    ticker: 'QCIL',
    name: 'Quality Chemicals Industries',
    sector: 'Healthcare',
    priceLabel: 'UGX 85.50',
    verdict: 'buy',
    peRatio: 9.5,
    dividendYield: 13.6,
    marketCap: 'UGX 684B',
    revGrowth: '+22.4%',
    thesis: 'Only pharmaceutical manufacturer at scale in East Africa. Essential medicine mandate provides revenue floor. African medicines market growing rapidly and QCIL is structurally well-positioned.',
    concerns: 'Thin margins typical of generics manufacturing. FX exposure on Active Pharmaceutical Ingredient (API) imports. Heavy reliance on donor-funded health programs (PEPFAR, Global Fund).',
    reasoning: 'Structural growth story as East Africa builds pharmaceutical self-sufficiency. P/E of 9.5x is reasonable given 22%+ revenue growth. High dividend yield of 13.6% (FY2025 total UGX 11.60/share paid across 3 tranches) is among the highest on the USE.',
  },
  {
    ticker: 'UMEME',
    name: 'Umeme Limited',
    sector: 'Utilities',
    priceLabel: 'UGX 220',
    verdict: 'hold',
    peRatio: 3.8,
    dividendYield: 11.8,
    marketCap: 'UGX 352B',
    revGrowth: '+4.2%',
    thesis: 'Former regulated utility; concession ended 31 Mar 2025. Paid UGX 26/share recurring interim (FY2024) plus an exceptional UGX 222/share special dividend from recovery of $118M government compensation — the largest single payout in USE history.',
    concerns: 'Post-concession business model undefined; future earning power is unclear. The UGX 222 special payout was a one-off, not recurring. Residual assets and wind-down costs create uncertainty.',
    reasoning: 'Recurring yield of 11.8% (UGX 26/share interim ÷ price) is real, but the business has no concession. Hold — assess reinvestment of the government proceeds before taking a position.',
  },
  {
    ticker: 'EBU',
    name: 'Equity Bank Uganda',
    sector: 'Banking',
    priceLabel: 'UGX 32',
    verdict: 'buy',
    peRatio: 8.5,
    dividendYield: 2.4,
    marketCap: 'UGX 128B',
    revGrowth: '+18.6%',
    thesis: 'Equity Group Holdings backing provides pan-African scale and technology. Strong focus on financial inclusion driving fast loan book growth. Digital banking strategy (Equitel) reducing cost-to-serve.',
    concerns: 'Integration execution risk with Equity Group strategy. SME credit quality in economic downturn scenarios. Competing aggressively with larger Stanbic on corporate mandates.',
    reasoning: 'Fastest-growing bank on the USE at 18.6% revenue growth, trading at a reasonable P/E of 8.5x. Digital-first approach creates a durable competitive moat.',
  },
  {
    ticker: 'BATU',
    name: 'British American Tobacco Uganda',
    sector: 'Consumer Goods',
    priceLabel: 'UGX 24,500',
    verdict: 'hold',
    peRatio: 7.5,
    dividendYield: 0.9,
    marketCap: 'UGX 490B',
    revGrowth: '-2.1%',
    thesis: 'BAT plc backing ensures product quality and brand strength. Dominant market position in Uganda tobacco with limited direct competition. FY2024 dividend was UGX 210/share (paid Jul 2025); FY2025 at UGX 199/share reflects a 5% cut due to illicit cigarette trade pressure.',
    concerns: 'Structural volume decline as anti-smoking regulation tightens globally. Revenue contraction of -2.1% signals shrinking addressable market. ESG restrictions may limit institutional ownership. Illicit cigarette trade surging — FY2025 profit fell to UGX 9.8B.',
    reasoning: 'Low yield of 0.9% (UGX 210/share ÷ price of UGX 24,500) makes this primarily a capital preservation play, not an income stock. Declining profits limit dividend growth prospects.',
  },
  {
    ticker: 'NIC',
    name: 'National Insurance Corporation',
    sector: 'Insurance',
    priceLabel: 'UGX 18',
    verdict: 'hold',
    peRatio: 10.5,
    dividendYield: 0,
    marketCap: 'UGX 54B',
    revGrowth: '+9.3%',
    thesis: 'Uganda\'s premier insurer with government-backed heritage. Penetration rates remain extremely low (~1% vs 3% regional average) implying significant structural runway. Compulsory motor and health segments provide recurring premium income.',
    concerns: 'No dividend since FY2022 (last paid Sep 2023 at UGX 1.00/share). Posted a loss in FY2023; FY2024 PAT of UGX 477M is too thin to support a payout. Low float and poor liquidity make entry/exit difficult.',
    reasoning: 'No dividend income currently. Reasonable valuation at P/E 10.5x with decent growth. Structural underinsurance is the long-term bull case. Hold — await profit recovery sufficient to resume dividends.',
  },
  {
    ticker: 'DFCU',
    name: 'DFCU Bank Limited',
    sector: 'Banking',
    priceLabel: 'UGX 301',
    verdict: 'hold',
    peRatio: 8.5,
    dividendYield: 6.7,
    marketCap: 'UGX 301B',
    revGrowth: '+6.4%',
    thesis: 'Trading at a conservative P/E of 8.5x with a strong dividend recovery. Acquired Crane Bank assets at distressed prices, adding scale to the loan book. FY2024 final dividend of UGX 20.09/share was a record, up 121% on 151% profit growth.',
    concerns: 'Integration of Crane Bank assets still carrying hidden NPL risk. Management quality concerns persist. Revenue growth of 6.4% lags sector peers meaningfully.',
    reasoning: 'Reasonable value at P/E 8.5x. Dividend yield of 6.7% (UGX 20.09/share FY2024 record payout) is now compelling. Hold — income investors benefit from yield; growth investors should look at EBU or SBU instead.',
  },
];

const VERDICT_STYLE: Record<Verdict, { label: string; textClass: string; bgClass: string; borderClass: string }> = {
  buy: { label: 'BUY', textClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/30' },
  hold: { label: 'HOLD', textClass: 'text-yellow-400', bgClass: 'bg-yellow-500/10', borderClass: 'border-yellow-500/30' },
  sell: { label: 'SELL', textClass: 'text-red-400', bgClass: 'bg-red-500/10', borderClass: 'border-red-500/30' },
};

export default function PeerWatchlist({ info, metrics }: Props) {
  const currentEntry = WATCHLIST.find(e => e.ticker === info.ticker);

  // Show current stock first (if in list), then others up to 8 total
  const others = WATCHLIST.filter(e => e.ticker !== info.ticker).slice(0, 7);
  const displayed = currentEntry ? [currentEntry, ...others] : others;

  const buys = displayed.filter(e => e.verdict === 'buy').length;
  const holds = displayed.filter(e => e.verdict === 'hold').length;
  const sells = displayed.filter(e => e.verdict === 'sell').length;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-7 bg-blue-500 rounded-full" />
          <div>
            <h2 className="text-xl font-bold text-white">USE Top Picks — Watchlist</h2>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Analyst Verdicts · Uganda Securities Exchange</p>
          </div>
        </div>
        {/* Verdict Summary */}
        <div className="flex gap-3">
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-400 font-mono">{buys}</div>
            <div className="text-xs text-slate-500 uppercase">Buy</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-400 font-mono">{holds}</div>
            <div className="text-xs text-slate-500 uppercase">Hold</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-400 font-mono">{sells}</div>
            <div className="text-xs text-slate-500 uppercase">Sell</div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {displayed.map(entry => {
          const cfg = VERDICT_STYLE[entry.verdict];
          const isCurrent = entry.ticker === info.ticker;

          return (
            <div
              key={entry.ticker}
              className={`bg-slate-800/60 rounded-xl p-5 flex flex-col border transition-all ${
                isCurrent
                  ? 'border-cyan-500/40 ring-1 ring-cyan-500/20'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-white">{entry.ticker}</span>
                    {isCurrent && (
                      <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-md border border-cyan-500/30 font-semibold">
                        VIEWING
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{entry.name} · {entry.priceLabel}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{entry.sector}</div>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wide border flex-shrink-0 ${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`}
                >
                  {cfg.label}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4 pb-4 border-b border-slate-700">
                {[
                  { label: 'P/E Ratio', value: `${entry.peRatio}x` },
                  { label: 'Div. Yield', value: `${entry.dividendYield}%` },
                  { label: 'Market Cap', value: entry.marketCap },
                  { label: 'Rev. Growth', value: entry.revGrowth },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                    <div className="text-xs font-mono font-semibold text-slate-300">{value}</div>
                  </div>
                ))}
              </div>

              {/* Thesis & Concerns */}
              <div className="space-y-3 flex-1">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">Thesis</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{entry.thesis}</p>
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-semibold">Concerns</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{entry.concerns}</p>
                </div>
              </div>

              {/* Reasoning Footer */}
              <div className="mt-4 pt-3 border-t border-slate-700 text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Verdict: </strong>
                {entry.reasoning}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-600 mt-5 text-center">
        Verdicts are illustrative analysis only, not personalized financial advice. Do your own due diligence before investing.
      </p>
    </div>
  );
}
