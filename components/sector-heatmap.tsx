"use client";

import { SectorPerformance } from "@/lib/types";

interface SectorHeatmapProps {
  sectors: SectorPerformance[];
}

export function SectorHeatmap({ sectors }: SectorHeatmapProps) {
  if (!sectors || sectors.length === 0) {
    return null;
  }

  const getColor = (change: number) => {
    if (change >= 2) return "bg-green-600 text-white";
    if (change >= 1) return "bg-green-500 text-white";
    if (change >= 0.5) return "bg-green-400 text-white";
    if (change > 0) return "bg-green-200 text-green-900";
    if (change === 0) return "bg-gray-100 text-gray-600";
    if (change > -0.5) return "bg-red-200 text-red-900";
    if (change > -1) return "bg-red-400 text-white";
    if (change > -2) return "bg-red-500 text-white";
    return "bg-red-600 text-white";
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-700">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900">Sector Performance</h2>
        <span className="text-xs text-gray-400 ml-auto">Today</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {sectors.map((sector) => (
          <div
            key={sector.ticker}
            className={`rounded-lg p-3 text-center transition-transform hover:scale-105 ${getColor(sector.changePercent)}`}
          >
            <div className="text-xs font-medium truncate" title={sector.name}>
              {sector.name}
            </div>
            <div className="text-sm font-bold mt-1">
              {sector.changePercent >= 0 ? "+" : ""}
              {sector.changePercent.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Gaining</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-200" />
          <span>Flat</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Falling</span>
        </div>
      </div>
    </section>
  );
}
