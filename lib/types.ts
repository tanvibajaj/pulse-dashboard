export interface NewsItem {
  title: string;
  source: string;
  url: string;
  summary?: string;
  publishedAt: string;
}

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  image: string;
}

export interface StockMover {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  explanation?: string;
}

export interface PulsePick {
  ticker: string;
  action: "Watch" | "Consider Buying" | "Consider Selling" | "Hold";
  reasoning: string;
  timeframe: string;
  riskLevel: "Low" | "Medium" | "High";
}

export interface DashboardData {
  lastUpdated: string;
  marketStatus: "Pre-Market" | "Open" | "After Hours" | "Closed";
  globalNews: NewsItem[];
  cryptoAssets: CryptoAsset[];
  aiNews: NewsItem[];
  techMovers: StockMover[];
  pulsePicks: PulsePick[];
}
