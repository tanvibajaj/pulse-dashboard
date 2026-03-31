import { StockMover } from "../types";

const TECH_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOG", "META", "AMZN", "TSLA", "AMD", "CRM", "NFLX"];

interface YahooQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
}

export async function fetchTechStocks(): Promise<StockMover[]> {
  try {
    const symbols = TECH_TICKERS.join(",");
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=symbol,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent`,
      {
        headers: {
          "User-Agent": "Pulse Dashboard/1.0",
        },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      console.error("Yahoo Finance API error:", res.status);
      return getMockStockData();
    }

    const data = await res.json();
    const quotes: YahooQuote[] = data?.quoteResponse?.result || [];

    if (quotes.length === 0) return getMockStockData();

    return quotes
      .map((q) => ({
        ticker: q.symbol || "",
        name: q.shortName || q.longName || q.symbol || "",
        price: q.regularMarketPrice || 0,
        change: q.regularMarketChange || 0,
        changePercent: q.regularMarketChangePercent || 0,
      }))
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  } catch (error) {
    console.error("Failed to fetch stock data:", error);
    return getMockStockData();
  }
}

export function getMarketStatus(): "Pre-Market" | "Open" | "After Hours" | "Closed" {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const hour = et.getHours();
  const minute = et.getMinutes();
  const day = et.getDay();
  const time = hour * 60 + minute;

  if (day === 0 || day === 6) return "Closed";
  if (time < 4 * 60) return "Closed";
  if (time < 9 * 60 + 30) return "Pre-Market";
  if (time < 16 * 60) return "Open";
  if (time < 20 * 60) return "After Hours";
  return "Closed";
}

function getMockStockData(): StockMover[] {
  return [
    { ticker: "NVDA", name: "NVIDIA Corp", price: 924.50, change: 38.20, changePercent: 4.31 },
    { ticker: "TSLA", name: "Tesla Inc", price: 178.30, change: -5.60, changePercent: -3.05 },
    { ticker: "META", name: "Meta Platforms", price: 512.80, change: 12.40, changePercent: 2.48 },
    { ticker: "AAPL", name: "Apple Inc", price: 198.50, change: 3.10, changePercent: 1.59 },
    { ticker: "MSFT", name: "Microsoft Corp", price: 428.90, change: -2.30, changePercent: -0.53 },
    { ticker: "GOOG", name: "Alphabet Inc", price: 178.20, change: 1.80, changePercent: 1.02 },
    { ticker: "AMZN", name: "Amazon.com", price: 186.40, change: -1.20, changePercent: -0.64 },
    { ticker: "AMD", name: "AMD Inc", price: 164.30, change: 6.80, changePercent: 4.32 },
    { ticker: "CRM", name: "Salesforce Inc", price: 298.50, change: -4.20, changePercent: -1.39 },
    { ticker: "NFLX", name: "Netflix Inc", price: 628.90, change: 8.50, changePercent: 1.37 },
  ];
}
