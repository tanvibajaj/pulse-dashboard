"use client";

import { EarningsEvent } from "@/lib/types";

interface EarningsProps {
  earnings: EarningsEvent[];
}

const timeColors: Record<string, string> = {
  "Before Open": "text-amber-600 bg-amber-50",
  "After Close": "text-indigo-600 bg-indigo-50",
  "TBD": "text-gray-500 bg-gray-100",
};

export function Earnings({ earnings }: EarningsProps) {
  if (!earnings || earnings.length === 0) return null;

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-600">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <h2 className="text-base font-semibold text-gray-900">Upcoming Earnings</h2>
      </div>
      <div className="flex flex-wrap gap-3">
        {earnings.map((e, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-2.5">
            <div>
              <span className="text-sm font-bold text-gray-900">{e.ticker}</span>
              <p className="text-[11px] text-gray-400">{e.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-700">{formatEarningsDate(e.date)}</p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${timeColors[e.time] || "text-gray-500 bg-gray-100"}`}>
                {e.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatEarningsDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + "T12:00:00");
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";

    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
