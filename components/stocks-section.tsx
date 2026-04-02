"use client";

import { StockMover } from "@/lib/types";
import { TrendingUp, TrendingDown } from "./icons";

interface StocksSectionProps {
  stocks: StockMover[];
}

export function StocksSection({ stocks }: StocksSectionProps) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Tech Movers</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {stocks.slice(0, 5).map((stock) => (
          <div
            key={stock.ticker}
            className="rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-base font-bold text-gray-900">{stock.ticker}</span>
              <div className="flex items-center gap-0.5">
                {stock.changePercent >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                )}
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    stock.changePercent >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stock.changePercent >= 0 ? "+" : ""}
                  {stock.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-1">{stock.name}</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums mb-2">
              ${stock.price.toFixed(2)}
            </p>
            {stock.explanation && (
              <p className="text-[11px] text-gray-500 leading-snug">
                {stock.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
