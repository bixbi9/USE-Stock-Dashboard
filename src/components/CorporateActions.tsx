'use client';

import { CorporateAction } from '@/types/stock';

interface CorporateActionsProps {
  actions: CorporateAction[];
}

export default function CorporateActions({ actions }: CorporateActionsProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'upcoming':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };
  
  const getImportanceStyles = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'bg-red-500/10 border-l-red-500';
      case 'medium':
        return 'bg-amber-500/10 border-l-amber-500';
      default:
        return 'bg-slate-500/10 border-l-slate-500';
    }
  };
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'AGM': return '🏛️';
      case 'EGM': return '📋';
      case 'Rights Issue': return '📈';
      case 'Bonus Issue': return '🎁';
      case 'Stock Split': return '✂️';
      case 'Earnings Release': return '📊';
      case 'Board Meeting': return '👥';
      default: return '📌';
    }
  };
  
  // Sort actions: upcoming first, then by date
  const sortedActions = [...actions].sort((a, b) => {
    if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
    if (b.status === 'upcoming' && a.status !== 'upcoming') return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
          <span className="text-xl">📅</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Corporate Actions</h3>
          <p className="text-slate-400 text-sm">Important company events and announcements</p>
        </div>
      </div>
      
      {sortedActions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-slate-400">No corporate actions available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedActions.map((action) => (
            <div 
              key={action.id}
              className={`p-4 rounded-xl border-l-4 ${getImportanceStyles(action.importance)} bg-slate-800/50`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getTypeIcon(action.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wide">{action.type}</span>
                      <h4 className="text-white font-semibold">{action.title}</h4>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border capitalize whitespace-nowrap ${getStatusStyles(action.status)}`}>
                      {action.status}
                    </span>
                  </div>
                  
                  <p className="text-slate-400 text-sm mb-2">{action.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">
                      📆 {action.date}
                    </span>
                    <span className={`capitalize ${
                      action.importance === 'high' ? 'text-red-400' :
                      action.importance === 'medium' ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {action.importance} priority
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

