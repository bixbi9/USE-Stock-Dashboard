'use client';

import { USE_STOCKS } from '@/types/stock';

interface StockSelectorProps {
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
}

export default function StockSelector({ selectedTicker, onSelectTicker }: StockSelectorProps) {
  return (
    <div className="bg-gradient-to-r from-emerald-900 to-teal-800 rounded-2xl p-6 shadow-xl border border-emerald-700/50">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">USE Stock Dashboard</h2>
            <p className="text-emerald-300 text-sm">Uganda Securities Exchange</p>
          </div>
        </div>
        
        <div className="flex-1 md:max-w-md md:ml-auto">
          <label className="block text-emerald-200 text-sm font-medium mb-2">
            Select Stock Ticker
          </label>
          <div className="relative">
            <select
              value={selectedTicker}
              onChange={(e) => onSelectTicker(e.target.value)}
              className="w-full appearance-none bg-emerald-950/50 border-2 border-emerald-600/50 rounded-xl px-4 py-3 text-white font-semibold focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all cursor-pointer hover:border-emerald-500"
            >
              {USE_STOCKS.map((stock) => (
                <option key={stock.ticker} value={stock.ticker} className="bg-emerald-900">
                  {stock.ticker} - {stock.name}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

