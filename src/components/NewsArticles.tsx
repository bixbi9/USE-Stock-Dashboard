'use client';

import { useState, useCallback } from 'react';
import { NewsArticle } from '@/types/stock';

interface Props {
  articles: NewsArticle[];
  ticker: string;
  onRefresh?: () => void;
  lastFetched?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const diffMs  = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)   return 'Just now';
  if (diffMin < 60)  return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr  < 24)  return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7)   return `${diffDay}d ago`;
  if (diffDay < 30)  return `${Math.floor(diffDay / 7)}w ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const SOURCE_COLORS: Record<string, string> = {
  'New Vision':         'bg-yellow-500/20 text-yellow-400',
  'Daily Monitor':      'bg-blue-500/20 text-blue-400',
  'The Observer':       'bg-purple-500/20 text-purple-400',
  'Nile Post':          'bg-cyan-500/20 text-cyan-400',
  'The East African':   'bg-orange-500/20 text-orange-400',
  'Business Daily':     'bg-indigo-500/20 text-indigo-400',
  'Nation Africa':      'bg-rose-500/20 text-rose-400',
  'Chimp Reports':      'bg-lime-500/20 text-lime-400',
  'USE Announcements':  'bg-teal-500/20 text-teal-400',
  'CMA Uganda':         'bg-violet-500/20 text-violet-400',
};

const SENTIMENT_CFG = {
  positive: { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-500', label: 'Positive' },
  negative: { badge: 'bg-red-500/20 text-red-400 border-red-500/30',            dot: 'bg-red-500',     label: 'Negative' },
  neutral:  { badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',      dot: 'bg-amber-400',   label: 'Neutral'  },
};

// ── Featured (top story) ──────────────────────────────────────────────────────

function FeaturedArticle({ article }: { article: NewsArticle }) {
  const cfg    = SENTIMENT_CFG[article.sentiment];
  const srcCls = SOURCE_COLORS[article.source] ?? 'bg-slate-700 text-slate-300';
  const isExt  = article.url && article.url !== '#';

  return (
    <div className="relative overflow-hidden bg-slate-800/70 border border-slate-600 rounded-xl p-5 mb-5 group">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-xl" />
      <div className="pl-3">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
            Top Story
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${srcCls}`}>{article.source}</span>
          <span className="text-xs text-slate-500 ml-auto">{relativeTime(article.publishedAt)}</span>
        </div>

        <h3 className="text-base font-bold text-white leading-snug mb-2 group-hover:text-emerald-400 transition-colors">
          {isExt
            ? <a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a>
            : article.title}
        </h3>

        {article.summary && (
          <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 mb-3">{article.summary}</p>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label} · {Math.abs(article.sentimentScore).toFixed(2)}
          </span>
          {isExt && (
            <a href={article.url} target="_blank" rel="noopener noreferrer"
               className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1">
              Read full article
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Article card ──────────────────────────────────────────────────────────────

function ArticleCard({ article }: { article: NewsArticle }) {
  const cfg    = SENTIMENT_CFG[article.sentiment];
  const srcCls = SOURCE_COLORS[article.source] ?? 'bg-slate-700 text-slate-300';
  const isExt  = article.url && article.url !== '#';

  return (
    <article className="group p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/80 transition-all flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${srcCls}`}>{article.source}</span>
        <span className="text-xs text-slate-500 ml-auto">{relativeTime(article.publishedAt)}</span>
      </div>

      <h4 className={`text-sm font-semibold leading-snug text-white ${isExt ? 'group-hover:text-cyan-400 transition-colors' : ''}`}>
        {isExt
          ? <a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a>
          : article.title}
      </h4>

      {article.summary && (
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{article.summary}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
        {isExt && (
          <a href={article.url} target="_blank" rel="noopener noreferrer"
             className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Read →
          </a>
        )}
      </div>
    </article>
  );
}

// ── Sentiment bar ─────────────────────────────────────────────────────────────

function SentimentBar({ articles }: { articles: NewsArticle[] }) {
  if (!articles.length) return null;
  const pos = articles.filter(a => a.sentiment === 'positive').length;
  const neg = articles.filter(a => a.sentiment === 'negative').length;
  const neu = articles.filter(a => a.sentiment === 'neutral').length;
  const tot = articles.length;
  return (
    <div className="mb-5">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-emerald-400 font-medium">{pos} positive</span>
        <span className="text-amber-400 font-medium">{neu} neutral</span>
        <span className="text-red-400 font-medium">{neg} negative</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {pos > 0 && <div className="sentiment-fill bg-emerald-500 rounded-l-full" style={{ '--sentiment-w': `${(pos / tot) * 100}%` } as React.CSSProperties} />}
        {neu > 0 && <div className="sentiment-fill bg-amber-500"                  style={{ '--sentiment-w': `${(neu / tot) * 100}%` } as React.CSSProperties} />}
        {neg > 0 && <div className="sentiment-fill bg-red-500 rounded-r-full"     style={{ '--sentiment-w': `${(neg / tot) * 100}%` } as React.CSSProperties} />}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function NewsArticles({ articles, ticker, onRefresh, lastFetched }: Props) {
  const [showAll,    setShowAll]    = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh, refreshing]);

  const sorted   = [...articles].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const featured = sorted[0];
  const rest     = sorted.slice(1);
  const visible  = showAll ? rest : rest.slice(0, 6);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
              <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v2"/>
              <path d="M4 11h10M4 15h6"/><rect x="2" y="7" width="6" height="4" rx="1"/>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Market Intelligence
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </h3>
            <p className="text-slate-400 text-sm">
              News &amp; analysis for <span className="text-white font-medium">{ticker}</span>
              {lastFetched && <span className="ml-2 text-slate-500">· {relativeTime(lastFetched)}</span>}
            </p>
          </div>
        </div>

        {onRefresh && (
          <button type="button" onClick={handleRefresh} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs text-slate-300 transition-colors border border-slate-600">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className={refreshing ? 'animate-spin' : ''}>
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            {refreshing ? 'Refreshing…' : 'Refresh feed'}
          </button>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3 opacity-30">📰</div>
          <p className="text-slate-400 font-medium text-lg">No recent articles found</p>
          <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
            News is scraped via RSS from East African publications every 4 hours. Check back soon.
          </p>
        </div>
      ) : (
        <>
          <SentimentBar articles={articles} />
          {featured && <FeaturedArticle article={featured} />}
          {visible.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visible.map(a => <ArticleCard key={a.id} article={a} />)}
            </div>
          )}
          {rest.length > 6 && (
            <button type="button" onClick={() => setShowAll(v => !v)}
              className="mt-4 w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl text-sm text-slate-400 hover:text-white transition-all">
              {showAll ? 'Show fewer articles' : `Show ${rest.length - 6} more articles`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
