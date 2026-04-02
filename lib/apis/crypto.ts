import { CryptoAsset } from "../types";

const TRACKED_COINS = "bitcoin,ethereum";

export async function fetchCryptoData(): Promise<CryptoAsset[]> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${TRACKED_COINS}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      console.error("CoinGecko API error:", res.status);
      return getMockCryptoData();
    }

    const data = await res.json();

    return data.map((coin: Record<string, unknown>) => ({
      id: coin.id as string,
      symbol: (coin.symbol as string).toUpperCase(),
      name: coin.name as string,
      price: coin.current_price as number,
      change24h: coin.price_change_percentage_24h as number || 0,
      marketCap: coin.market_cap as number,
      image: coin.image as string,
    }));
  } catch (error) {
    console.error("Failed to fetch crypto data:", error);
    return getMockCryptoData();
  }
}

function getMockCryptoData(): CryptoAsset[] {
  return [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 87420, change24h: 2.3, marketCap: 1720000000000, image: "" },
    { id: "ethereum", symbol: "ETH", name: "Ethereum", price: 4120, change24h: -0.8, marketCap: 495000000000, image: "" },
    { id: "solana", symbol: "SOL", name: "Solana", price: 187, change24h: 5.1, marketCap: 82000000000, image: "" },
    { id: "ripple", symbol: "XRP", name: "XRP", price: 2.45, change24h: 1.2, marketCap: 140000000000, image: "" },
    { id: "cardano", symbol: "ADA", name: "Cardano", price: 0.72, change24h: -1.5, marketCap: 25000000000, image: "" },
  ];
}
