"use client";

import { RefreshCw } from "./icons";

interface HeaderProps {
  marketStatus: string;
  lastUpdated: string;
  onRefresh: () => void;
  loading: boolean;
}

const statusColors: Record<string, string> = {
  Open: "bg-green-500",
  "Pre-Market": "bg-yellow-500",
  "After Hours": "bg-orange-500",
  Closed: "bg-gray-400",
};

export function Header({ marketStatus, lastUpdated, onRefresh, loading }: HeaderProps) {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const updatedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

  return (
    <header className="flex items-center justify-between border-b border-gray-200 pb-6 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Pulse
        </h1>
        <p className="text-sm text-gray-500 mt-1">{date}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${statusColors[marketStatus] || "bg-gray-400"}`}
          />
          <span className="text-sm font-medium text-gray-600">{marketStatus}</span>
        </div>
        <span className="text-xs text-gray-400">Updated {updatedTime}</span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </header>
  );
}
