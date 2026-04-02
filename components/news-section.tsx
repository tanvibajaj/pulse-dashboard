"use client";

import { NewsItem } from "@/lib/types";
import { ExternalLink, Globe } from "./icons";

interface NewsSectionProps {
  news: NewsItem[];
}

export function NewsSection({ news }: NewsSectionProps) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Global Headlines</h2>
      </div>
      <div className="space-y-1">
        {news.length === 0 ? (
          <p className="text-sm text-gray-400">No headlines available</p>
        ) : (
          news.map((item, i) => (
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
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {item.source}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTime(item.publishedAt)}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 flex-shrink-0 mt-1" />
              </div>
            </a>
          ))
        )}
      </div>
    </section>
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
