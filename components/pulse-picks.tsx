"use client";

import { PulsePick } from "@/lib/types";
import { Target } from "./icons";

interface PulsePicksProps {
  picks: PulsePick[];
}

const actionColors: Record<string, string> = {
  Watch: "bg-blue-50 text-blue-700 border-blue-200",
  "Consider Buying": "bg-green-50 text-green-700 border-green-200",
  "Consider Selling": "bg-red-50 text-red-700 border-red-200",
  Hold: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const riskColors: Record<string, string> = {
  Low: "text-green-600",
  Medium: "text-yellow-600",
  High: "text-red-600",
};

export function PulsePicks({ picks }: PulsePicksProps) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Pulse Picks</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">AI-generated watchlist based on today&apos;s data</p>

      <div className="grid gap-4 md:grid-cols-3">
        {picks.map((pick, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl font-bold text-gray-900">{pick.ticker}</span>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  actionColors[pick.action] || "bg-gray-50 text-gray-700"
                }`}
              >
                {pick.action}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              {pick.reasoning}
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{pick.timeframe}</span>
              <span className={`font-medium ${riskColors[pick.riskLevel] || "text-gray-500"}`}>
                {pick.riskLevel} Risk
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-[10px] text-gray-300 text-center">
          For informational purposes only. Not financial advice. Always do your own research.
        </p>
      </div>
    </section>
  );
}
