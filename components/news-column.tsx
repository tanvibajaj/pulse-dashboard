"use client";

import { NewsItem } from "@/lib/types";
import { ExternalLink } from "./icons";

interface NewsColumnProps {
  title: string;
  icon: React.ReactNode;
  news: NewsItem[];
  accentColor: "blue" | "orange" | "purple";
}

const colors = {
  blue: {
    badge: "text-blue-600 bg-blue-50",
    hover: "group-hover:text-blue-600",
    icon: "group-hover:text-blue-400",
  },
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
};

export function NewsColumn({ title, icon, news, accentColor }: NewsColumnProps) {
  const c = colors[accentColor];

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="space-y-0.5">
        {news.length === 0 ? (
          <p className="text-sm text-gray-400">No stories available</p>
        ) : (
          news.map((item) => (
            <a
              key={item.url || item.title}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.badge}`}>
                      {item.source}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatTime(item.publishedAt)}
                    </span>
                  </div>
                  <h3 className={`text-sm font-medium text-gray-900 leading-snug ${c.hover} transition-colors`}>
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                      {item.summary}
                    </p>
                  )}
                </div>
                <ExternalLink className={`w-3 h-3 text-gray-300 ${c.icon} flex-shrink-0 mt-1`} />
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
