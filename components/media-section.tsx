"use client";

import { PodcastSummary } from "@/lib/types";

interface MediaSectionProps {
  podcasts: PodcastSummary[];
}

export function MediaSection({ podcasts }: MediaSectionProps) {
  if (!podcasts || podcasts.length === 0) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <PodcastIcon className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Media</h2>
        </div>
        <p className="text-sm text-gray-400">No new podcast summaries yet. Run <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">./scripts/podcasts.sh</code> to generate.</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        <PodcastIcon className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Media</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">AI-generated podcast summaries</p>

      <div className="space-y-4">
        {podcasts.map((pod, i) => (
          <a
            key={i}
            href={pod.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    {pod.podcast}
                  </span>
                  <span className="text-[10px] text-gray-400">{pod.duration}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
                  {pod.title}
                </h3>
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{formatDate(pod.date)}</span>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              {pod.summary}
            </p>

            {pod.keyTakeaways && pod.keyTakeaways.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Key Takeaways</h4>
                <ul className="space-y-1">
                  {pod.keyTakeaways.map((t, j) => (
                    <li key={j} className="text-xs text-gray-500 flex gap-2">
                      <span className="text-gray-300 flex-shrink-0">-</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

function PodcastIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
