"use client";

import { CryptoAsset, NewsItem } from "@/lib/types";
import { TrendingUp, TrendingDown, ExternalLink, Cpu } from "./icons";

interface CryptoSectionProps {
  assets: CryptoAsset[];
  cryptoNews: NewsItem[];
  aiNews: NewsItem[];
}

export function CryptoSection({ assets, cryptoNews, aiNews }: CryptoSectionProps) {
  const btcEth = assets.filter((a) => a.symbol === "BTC" || a.symbol === "ETH");

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Crypto & AI</h2>
      </div>

      {/* BTC + ETH only */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {btcEth.map((asset) => (
          <div
            key={asset.id}
            className="p-4 rounded-lg bg-gray-50 border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-2">
              {asset.image && (
                <img src={asset.image} alt={asset.symbol} className="w-6 h-6 rounded-full" />
              )}
              <span className="text-sm font-bold text-gray-700">{asset.symbol}</span>
              <span className="text-xs text-gray-400">{asset.name}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              ${formatPrice(asset.price)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {asset.change24h >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  asset.change24h >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {asset.change24h >= 0 ? "+" : ""}
                {asset.change24h.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Crypto News */}
      <div className="mb-4 flex-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Crypto News
        </h3>
        <NewsList items={cryptoNews.slice(0, 5)} color="orange" />
      </div>

      {/* AI & Tech News */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          AI & Tech News
        </h3>
        <NewsList items={aiNews.slice(0, 3)} color="purple" />
      </div>
    </section>
  );
}

function NewsList({ items, color }: { items: NewsItem[]; color: "orange" | "purple" }) {
  const colorClasses = {
    orange: {
      badge: "text-orange-600 bg-orange-50",
      hover: "group-hover:text-orange-600",
      icon: "group-hover:text-orange-400",
    },
    purple: {
      badge: "text-purple-600 bg-purple-50",
      hover: "group-hover:text-purple-600",
      icon: "group-hover:text-purple-400",
    },
  }[color];

  if (items.length === 0) {
    return <p className="text-sm text-gray-400">No news available</p>;
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <a
          key={i}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClasses.badge}`}>
                  {item.source}
                </span>
                <span className="text-xs text-gray-400">
                  {formatTime(item.publishedAt)}
                </span>
              </div>
              <h3 className={`text-sm font-medium text-gray-900 ${colorClasses.hover} transition-colors`}>
                {item.title}
              </h3>
              {item.summary && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {item.summary}
                </p>
              )}
            </div>
            <ExternalLink className={`w-3.5 h-3.5 text-gray-300 ${colorClasses.icon} flex-shrink-0 mt-1`} />
          </div>
        </a>
      ))}
    </div>
  );
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHrs < 1) return "Just now";
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}
