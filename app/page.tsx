"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardData } from "@/lib/types";
import { Header } from "@/components/header";
import { TickerBar } from "@/components/ticker-bar";
import { NewsColumn } from "@/components/news-column";
import { StocksSection } from "@/components/stocks-section";
import { PulsePicks } from "@/components/pulse-picks";
import { Earnings } from "@/components/earnings";

import { Globe, Cpu } from "@/components/icons";

function CryptoIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/refresh${force ? "?force=true" : ""}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => fetchData(true)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-end justify-between border-b border-gray-200 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Pulse</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
            <StatusBadge status={data?.marketStatus || "—"} />
            <span className="text-xs text-gray-400">
              {data?.lastUpdated ? `Updated ${new Date(data.lastUpdated).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}
            </span>
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`}>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
            </button>
        </div>
      </div>

      {loading && !data ? (
        <LoadingSkeleton />
      ) : data ? (
        <DashboardTab data={data} />
      ) : null}
    </main>
  );
}

function DashboardTab({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-5">
      <TickerBar
        cryptoAssets={data.cryptoAssets}
        visaStock={data.visaStock}
        fearGreedIndex={data.fearGreedIndex}
        indicators={data.marketIndicators}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <NewsColumn
          title="Global News"
          icon={<Globe className="w-4 h-4 text-gray-600" />}
          news={data.globalNews}
          accentColor="blue"
        />
        <NewsColumn
          title="Crypto"
          icon={<CryptoIcon className="w-4 h-4 text-gray-600" />}
          news={data.cryptoNews}
          accentColor="orange"
        />
        <NewsColumn
          title="AI & Tech"
          icon={<Cpu className="w-4 h-4 text-gray-600" />}
          news={data.aiNews}
          accentColor="purple"
        />
      </div>

      {data.earnings && data.earnings.length > 0 && (
        <Earnings earnings={data.earnings} />
      )}

      <StocksSection stocks={data.techMovers} />
      <PulsePicks picks={data.pulsePicks} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Open: "bg-green-500",
    "Pre-Market": "bg-yellow-500",
    "After Hours": "bg-orange-500",
    Closed: "bg-gray-400",
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || "bg-gray-400"}`} />
      <span className="text-sm font-medium text-gray-600">{status}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="bg-white rounded-xl border border-gray-200 h-16" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="bg-white rounded-xl border border-gray-200 h-80" />
        <div className="bg-white rounded-xl border border-gray-200 h-80" />
        <div className="bg-white rounded-xl border border-gray-200 h-80" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 h-48" />
      <div className="bg-white rounded-xl border border-gray-200 h-48" />
    </div>
  );
}
