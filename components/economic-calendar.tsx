"use client";

import { EconomicEvent } from "@/lib/types";

interface EconomicCalendarProps {
  events: EconomicEvent[];
}

export function EconomicCalendar({ events }: EconomicCalendarProps) {
  if (!events || events.length === 0) {
    return (
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-700">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Economic Calendar</h2>
        </div>
        <p className="text-sm text-gray-400">No major events in the next 2 weeks</p>
      </section>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) {
      return "Today";
    }
    if (date.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    }
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const importanceColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-700">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900">Economic Calendar</h2>
        <span className="text-xs text-gray-400 ml-auto">Next 2 weeks</span>
      </div>

      <div className="space-y-3">
        {events.map((event, i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="text-center min-w-[70px]">
              <div className="text-sm font-semibold text-gray-900">
                {formatDate(event.date)}
              </div>
              <div className="text-xs text-gray-500">{event.time}</div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">{event.event}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${importanceColors[event.importance]}`}>
                  {event.importance}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">{event.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 text-center">
          High importance events often cause market volatility
        </p>
      </div>
    </section>
  );
}
