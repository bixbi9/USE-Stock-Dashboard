'use client';

import { StockInfo, StockMetrics } from '@/types/stock';

interface Props {
  info: StockInfo;
  metrics: StockMetrics;
}

type Severity = 'high' | 'medium' | 'low-medium' | 'low';

interface RiskCard {
  title: string;
  severity: Severity;
  points: string[];
  impact: string;
}

const SEVERITY: Record<Severity, { label: string; textColor: string; bgColor: string; borderColor: string; gaugeColor: string; gaugeWidth: string }> = {
  high: {
    label: 'High',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    gaugeColor: 'bg-red-500',
    gaugeWidth: '85%',
  },
  medium: {
    label: 'Medium',
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    gaugeColor: 'bg-orange-500',
    gaugeWidth: '55%',
  },
  'low-medium': {
    label: 'Low–Med',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    gaugeColor: 'bg-yellow-500',
    gaugeWidth: '40%',
  },
  low: {
    label: 'Low',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    gaugeColor: 'bg-emerald-500',
    gaugeWidth: '20%',
  },
};

const BASE_RISKS: RiskCard[] = [
  {
    title: 'Currency / FX Risk',
    severity: 'high',
    points: [
      'UGX has depreciated ~7–10% annually vs USD over 5 years',
      'USD-denominated imports inflate input costs',
      'Foreign investor returns eroded by exchange rate moves',
      'BOU interventions may be insufficient during global stress',
      'Cross-border revenue in USD/KES subject to repatriation risk',
    ],
    impact: 'Significant for companies with foreign currency obligations. Monitor BOU monetary policy and East African inflation trajectory.',
  },
  {
    title: 'Market Liquidity Risk',
    severity: 'high',
    points: [
      'USE average daily turnover consistently below $1M USD',
      'Bid-ask spreads can exceed 2–5% for small-cap stocks',
      'Institutional exits may require weeks to execute at fair prices',
      'Price discovery limited by thin free float and low retail participation',
      'Circuit breakers and trading halts can freeze positions unexpectedly',
    ],
    impact: 'High impact for positions > UGX 10M. Plan for extended holding periods and use limit orders. Illiquidity premium embedded in valuations.',
  },
  {
    title: 'Regulatory & Political Risk',
    severity: 'medium',
    points: [
      'Bank of Uganda can adjust capital and reserve requirements',
      'URA tax policy changes can materially impact net income',
      'Sector-specific regulation (UCC for telecoms, IRA for insurance)',
      'Government ownership stakes in key companies limit capital allocation',
      'Political stability broadly supports business environment',
    ],
    impact: 'Moderate near-term risk. Regulatory environment is stable but subject to policy shifts. Monitor pre-election spending cycles.',
  },
  {
    title: 'Macroeconomic Cycle Risk',
    severity: 'low-medium',
    points: [
      'Uganda GDP growth projected at ~5–6% for 2026',
      'Inflation stabilizing after the 2022–2024 spike cycle',
      'East African Community integration expanding addressable market',
      'Kingfisher/EACOP oil production ramp-up adds upside from 2026+',
      'Consumer spending growth supports domestic-facing sectors',
    ],
    impact: 'Low near-term risk given positive macro trajectory. Oil revenue windfall in 2026+ could be structurally transformative for Uganda.',
  },
];

const SECTOR_RISKS: Partial<Record<string, RiskCard>> = {
  Telecommunications: {
    title: 'Telecom Sector Risk',
    severity: 'medium',
    points: [
      'Mobile money regulation may cap transaction fee revenue',
      'Competition between MTN and Airtel compresses ARPU',
      'Data infrastructure capex requirements are rising (5G)',
      'Spectrum auction costs could strain balance sheets',
      'Urban market penetration nearing saturation',
    ],
    impact: 'ARPU growth depends on upselling mobile financial services and rural expansion. Watch MoMo regulatory changes from UCC.',
  },
  Banking: {
    title: 'Banking Sector Risk',
    severity: 'medium',
    points: [
      'Non-performing loan ratios elevated in SME and agri portfolios',
      'BOU raised CBR; net interest margins under pressure',
      'Mobile money competition reducing retail fee income',
      'Credit risk concentration in real estate and agriculture',
      'Basel III compliance costs increasing operational burden',
    ],
    impact: 'Asset quality is the key metric to monitor. Banks with strong provisioning buffers and diversified loan books are better positioned.',
  },
  Manufacturing: {
    title: 'Manufacturing Sector Risk',
    severity: 'medium',
    points: [
      'Input cost inflation from imported raw materials and FX',
      'UMEME tariff increases raise energy costs across the sector',
      'Infrastructure constraints limit distribution to upcountry markets',
      'Import competition from Kenya, China, and regional players',
      'Small domestic market limits scale economies',
    ],
    impact: 'Margin compression risk is real. Prioritize companies with pricing power and domestic import-substitution moats.',
  },
  Utilities: {
    title: 'Utility Sector Risk',
    severity: 'high',
    points: [
      'UMEME concession renewal uncertainty post-2025',
      'Government may not renew distribution concession on same terms',
      'Technical and commercial losses (theft) remain structurally high',
      'Energy access gaps limit customer base expansion',
      'Tariff adjustments require UEDCL/ERA regulatory approval',
    ],
    impact: 'Concession renewal is an existential event risk. Position sizing should reflect binary outcome uncertainty.',
  },
  Healthcare: {
    title: 'Healthcare Sector Risk',
    severity: 'low-medium',
    points: [
      'Thin generics margins typical across the sector globally',
      'API (Active Pharmaceutical Ingredient) imports expose FX risk',
      'Dependence on donor-funded health programs (PEPFAR, Global Fund)',
      'Regulatory approval timelines for new products can be long',
      'Competition from regional and imported medicines',
    ],
    impact: 'Structural growth story intact. Donor program risk is manageable with private-sector revenue diversification.',
  },
  Insurance: {
    title: 'Insurance Sector Risk',
    severity: 'low-medium',
    points: [
      'Underinsurance remains structurally high in Uganda',
      'IRA regulatory capital requirements under review',
      'Claims inflation from rising healthcare and property costs',
      'Distribution costs high due to fragmented geography',
      'Reinsurance costs rising globally post-2024 catastrophe losses',
    ],
    impact: 'Long runway for penetration growth. Focus on companies with efficient distribution and disciplined underwriting.',
  },
};

function getRisksForStock(info: StockInfo, metrics: StockMetrics): RiskCard[] {
  const sectorRisk = SECTOR_RISKS[info.sector];
  const risks = [...BASE_RISKS];
  if (sectorRisk) {
    risks.splice(2, 0, sectorRisk); // insert before macro risk
  }
  return risks.slice(0, 5);
}

export default function RiskAnalysis({ info, metrics }: Props) {
  const risks = getRisksForStock(info, metrics);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-7 bg-orange-500 rounded-full" />
        <div>
          <h2 className="text-xl font-bold text-white">Risk Analysis</h2>
          <p className="text-xs text-slate-500 uppercase tracking-wider">{info.ticker} · Key Risk Factors &amp; Quantification</p>
        </div>
      </div>

      {/* Risk Summary Bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(['high', 'medium', 'low-medium', 'low'] as Severity[]).map(sev => {
          const count = risks.filter(r => r.severity === sev).length;
          const cfg = SEVERITY[sev];
          return (
            <div key={sev} className={`rounded-xl p-3 text-center border ${cfg.bgColor} ${cfg.borderColor}`}>
              <div className={`text-2xl font-bold font-mono ${cfg.textColor}`}>{count}</div>
              <div className={`text-xs font-semibold uppercase tracking-wide ${cfg.textColor}`}>{cfg.label}</div>
            </div>
          );
        })}
      </div>

      {/* Risk Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {risks.map(risk => {
          const cfg = SEVERITY[risk.severity];
          return (
            <div
              key={risk.title}
              className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col"
            >
              {/* Card Header */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-bold text-white">{risk.title}</h3>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wide border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}
                >
                  {cfg.label}
                </span>
              </div>

              {/* Gauge */}
              <div className="h-1.5 bg-slate-700 rounded-full mb-4 overflow-hidden">
                <div
                  className={`h-full rounded-full ${cfg.gaugeColor} transition-all duration-700`}
                  style={{ width: cfg.gaugeWidth }}
                />
              </div>

              {/* Risk Points */}
              <ul className="space-y-1.5 flex-1 mb-4">
                {risk.points.map((pt, i) => (
                  <li key={i} className="text-xs text-slate-400 pl-4 relative leading-relaxed">
                    <span className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                    {pt}
                  </li>
                ))}
              </ul>

              {/* Impact */}
              <div className="pt-3 border-t border-slate-700 text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Impact: </strong>
                {risk.impact}
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-slate-600 mt-5 text-center">
        Risk assessments are qualitative estimates for informational purposes only. Past risk factors do not predict future outcomes.
      </p>
    </div>
  );
}
