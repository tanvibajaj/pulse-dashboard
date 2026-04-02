"use client";

import { CryptoAsset, MarketIndicator, StockMover } from "@/lib/types";
import { TrendingUp, TrendingDown } from "./icons";

interface TickerBarProps {
  cryptoAssets: CryptoAsset[];
  visaStock?: StockMover;
  fearGreedIndex?: number;
  indicators?: MarketIndicator[];
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function fearGreedLabel(value: number): { label: string; color: string } {
  if (value <= 25) return { label: "Extreme Fear", color: "text-red-600" };
  if (value <= 45) return { label: "Fear", color: "text-orange-500" };
  if (value <= 55) return { label: "Neutral", color: "text-gray-500" };
  if (value <= 75) return { label: "Greed", color: "text-green-500" };
  return { label: "Extreme Greed", color: "text-green-600" };
}

function ChangeIndicator({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {value >= 0 ? (
        <TrendingUp className="w-3 h-3 text-green-500" />
      ) : (
        <TrendingDown className="w-3 h-3 text-red-500" />
      )}
      <span className={`text-xs font-medium ${value >= 0 ? "text-green-600" : "text-red-600"}`}>
        {value >= 0 ? "+" : ""}{value.toFixed(1)}%
      </span>
    </div>
  );
}

export function TickerBar({ cryptoAssets, visaStock, fearGreedIndex, indicators }: TickerBarProps) {
  const fg = fearGreedIndex != null ? fearGreedLabel(fearGreedIndex) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
      {/* Visa Stock */}
      {visaStock && (
        <>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-700 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">V</span>
            </div>
            <div>
              <span className="text-xs font-bold text-blue-700">VISA</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-900">${formatPrice(visaStock.price)}</span>
                <ChangeIndicator value={visaStock.changePercent} />
              </div>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200" />
        </>
      )}

      {/* Crypto */}
      {cryptoAssets.map((asset) => (
        <div key={asset.id} className="flex items-center gap-3">
          {asset.image && (
            <img src={asset.image} alt={asset.symbol} className="w-6 h-6 rounded-full" />
          )}
          <div>
            <span className="text-xs font-bold text-gray-500">{asset.symbol}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-gray-900">${formatPrice(asset.price)}</span>
              <ChangeIndicator value={asset.change24h} />
            </div>
          </div>
        </div>
      ))}

      {/* Divider */}
      <div className="h-8 w-px bg-gray-200" />

      {/* Fear & Greed */}
      {fg && (
        <div>
          <span className="text-xs font-bold text-gray-500">Fear & Greed</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900">{fearGreedIndex}</span>
            <span className={`text-xs font-medium ${fg.color}`}>{fg.label}</span>
          </div>
        </div>
      )}

      {/* Market Indicators */}
      {indicators?.map((ind, i) => (
        <div key={i}>
          <span className="text-xs font-bold text-gray-500">{ind.label}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-900">{ind.value}</span>
            {ind.change != null && (
              <span className={`text-xs font-medium ${ind.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {ind.change >= 0 ? "+" : ""}{ind.change.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
