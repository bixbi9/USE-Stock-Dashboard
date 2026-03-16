'use client';

import { DividendAnnouncement } from '@/types/stock';

interface Props {
  dividends: DividendAnnouncement[];
  currency: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(raw: string): string {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(raw: string): number | null {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

function totalAnnual(divs: DividendAnnouncement[]): number {
  const currentYear = new Date().getFullYear();
  return divs
    .filter(d => d.year === currentYear || d.year === currentYear - 1)
    .reduce((sum, d) => sum + d.amount, 0);
}

const STATUS_CFG: Record<string, { label: string; text: string; bg: string; border: string; dot: string }> = {
  upcoming: { label: 'Upcoming',  text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',   dot: 'bg-blue-400'    },
  paid:     { label: 'Paid',      text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  declared: { label: 'Declared',  text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',  dot: 'bg-amber-400'   },
};
const STATUS_FALLBACK = { label: 'Unknown', text: 'text-slate-400', bg: 'bg-slate-700/40', border: 'border-slate-600', dot: 'bg-slate-500' };

const TYPE_CFG: Record<string, string> = {
  final:   'bg-purple-500/20 text-purple-300',
  interim: 'bg-cyan-500/20 text-cyan-300',
  special: 'bg-amber-500/20 text-amber-300',
};

// ── Upcoming banner ───────────────────────────────────────────────────────────

function UpcomingBanner({ div, currency }: { div: DividendAnnouncement; currency: string }) {
  const days = daysUntil(div.paymentDate);
  const urgencyColor = days !== null && days <= 7 ? 'from-emerald-900/60 to-emerald-800/40 border-emerald-500/40'
                     : days !== null && days <= 30 ? 'from-blue-900/60 to-blue-800/40 border-blue-500/40'
                     : 'from-slate-800/80 to-slate-700/40 border-slate-600/50';

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${urgencyColor} border rounded-2xl p-6 mb-6`}>
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Next Dividend
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TYPE_CFG[div.type] ?? 'bg-slate-700 text-slate-300'}`}>
              {div.type}
            </span>
            <span className="text-slate-400 text-xs">FY {div.year}</span>
          </div>

          <div className="text-4xl font-bold text-white mb-1">
            {currency} {div.amount.toLocaleString()}
            <span className="text-xl font-normal text-slate-400 ml-2">per share</span>
          </div>

          {days !== null && (
            <p className="text-sm text-slate-300 mt-1">
              {days > 0
                ? <><span className="font-semibold text-white">{days} days</span> until payment</>
                : days === 0
                ? <span className="font-semibold text-emerald-400">Payment day today!</span>
                : <span className="text-slate-400">Paid {Math.abs(days)} days ago</span>}
            </p>
          )}
        </div>

        {/* Date column */}
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Ex-Dividend', value: div.exDividendDate },
            { label: 'Record Date', value: div.recordDate },
            { label: 'Payment Date', value: div.paymentDate },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-900/60 rounded-xl p-3 min-w-[90px]">
              <div className="text-slate-500 text-xs mb-1">{label}</div>
              <div className="text-white text-sm font-semibold">{formatDate(value)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── History row ───────────────────────────────────────────────────────────────

function HistoryRow({ div, currency, maxAmount }: { div: DividendAnnouncement; currency: string; maxAmount: number }) {
  const cfg = STATUS_CFG[div.status] ?? STATUS_FALLBACK;
  const barPct = maxAmount > 0 ? (div.amount / maxAmount) * 100 : 0;

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 p-4 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 hover:border-slate-600 rounded-xl transition-all">
      {/* Left info */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TYPE_CFG[div.type] ?? 'bg-slate-700 text-slate-300'}`}>
            {div.type}
          </span>
          <span className="text-slate-500 text-xs ml-auto">FY {div.year}</span>
        </div>

        {/* Amount bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="dividend-bar-fill bg-emerald-500"
              style={{ '--bar-w': `${barPct}%` } as React.CSSProperties}
            />
          </div>
          <span className="text-emerald-400 font-bold text-sm whitespace-nowrap">
            {currency} {div.amount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Right dates */}
      <div className="text-right hidden sm:block">
        <div className="text-slate-500 text-xs">Payment</div>
        <div className="text-white text-sm font-medium">{formatDate(div.paymentDate)}</div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DividendAnnouncements({ dividends, currency }: Props) {
  const sorted   = [...dividends].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  const upcoming = sorted.filter(d => d.status === 'upcoming' || d.status === 'declared');
  const history  = sorted.filter(d => d.status === 'paid');
  const maxAmt   = Math.max(...sorted.map(d => d.amount), 0);
  const annual   = totalAnnual(dividends);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><path d="M8.5 9.5L12 6l3.5 3.5"/>
              <path d="M8 16s1-2 4-2 4 2 4 2"/>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Dividend Announcements
              {upcoming.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                  {upcoming.length} upcoming
                </span>
              )}
            </h3>
            <p className="text-slate-400 text-sm">Income distributions &amp; payment schedule</p>
          </div>
        </div>

        {/* Annual total pill */}
        {annual > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2 text-center">
            <div className="text-slate-400 text-xs mb-0.5">Annual Total</div>
            <div className="text-emerald-400 font-bold text-lg">{currency} {annual.toLocaleString()}</div>
          </div>
        )}
      </div>

      {dividends.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3 opacity-30">📭</div>
          <p className="text-slate-400 font-medium text-lg">No dividend announcements</p>
          <p className="text-slate-500 text-sm mt-2">
            Dividend data is scraped from USE and African Financials every 24 hours.
          </p>
        </div>
      ) : (
        <>
          {/* Upcoming highlighted banner */}
          {upcoming.length > 0 && (
            <UpcomingBanner div={upcoming[0]} currency={currency} />
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/50">
              <div className="text-slate-400 text-xs mb-1">Total Paid</div>
              <div className="text-white font-bold text-lg">{history.length}</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/50">
              <div className="text-slate-400 text-xs mb-1">Upcoming</div>
              <div className="text-blue-400 font-bold text-lg">{upcoming.length}</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-slate-700/50">
              <div className="text-slate-400 text-xs mb-1">Highest</div>
              <div className="text-emerald-400 font-bold text-lg">
                {currency} {maxAmt.toLocaleString()}
              </div>
            </div>
          </div>

          {/* History list */}
          {sorted.length > 0 && (
            <>
              {upcoming.length > 0 && history.length > 0 && (
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  History
                </h4>
              )}
              <div className="space-y-2">
                {(upcoming.length > 0 ? history : sorted).map(d => (
                  <HistoryRow key={d.id} div={d} currency={currency} maxAmount={maxAmt} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
