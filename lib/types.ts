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

export interface SectorPerformance {
  ticker: string;
  name: string;
  changePercent: number;
}

export interface EconomicEvent {
  date: string;
  time: string;
  event: string;
  importance: "high" | "medium" | "low";
  description: string;
}

export interface MarketIndicator {
  label: string;
  value: string;
  change?: number;
}

export interface DashboardData {
  lastUpdated: string;
  marketStatus: "Pre-Market" | "Open" | "After Hours" | "Closed";
  globalNews: NewsItem[];
  cryptoAssets: CryptoAsset[];
  cryptoNews: NewsItem[];
  aiNews: NewsItem[];
  techMovers: StockMover[];
  fearGreedIndex?: number;
  visaStock?: StockMover;
  marketIndicators?: MarketIndicator[];
  sectors?: SectorPerformance[];
  economicCalendar?: EconomicEvent[];
}
