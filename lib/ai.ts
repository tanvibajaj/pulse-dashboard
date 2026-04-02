import Anthropic from "@anthropic-ai/sdk";
import { NewsItem, StockMover, CryptoAsset, PulsePick } from "./types";

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === "your-key-here") return null;
  return new Anthropic({ apiKey: key });
}

export async function filterAndSummarizeGlobalNews(articles: NewsItem[]): Promise<NewsItem[]> {
  const client = getClient();
  if (!client) return articles.slice(0, 5);

  try {
    const articleList = articles
      .map((a, i) => `${i + 1}. [${a.source}] ${a.title}\n   ${a.summary || "No description"}`)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a news curator for a product lead at a fintech/crypto company. From these articles, select the TOP 5 most important stories that matter for someone in tech/finance. Prioritize: geopolitics affecting markets, economic policy, trade/sanctions, energy/oil crises, tech regulation, major global events. EXCLUDE: local crime, human interest fluff, celebrity news, sports, quirky/weird stories.

For each selected article, return its original index (1-based) and a concise 1-sentence summary (max 20 words).

Return JSON: [{"index": 1, "summary": "..."}]. No markdown wrapping.

Articles:\n${articleList}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const picks: { index: number; summary: string }[] = JSON.parse(text);

    return picks.slice(0, 5).map((pick) => {
      const article = articles[pick.index - 1];
      return article ? { ...article, summary: pick.summary } : articles[0];
    }).filter(Boolean);
  } catch (error) {
    console.error("AI news filter failed:", error);
    return articles.slice(0, 5);
  }
}

export async function filterCryptoAINews(
  cryptoNews: NewsItem[],
  aiNews: NewsItem[]
): Promise<{ crypto: NewsItem[]; ai: NewsItem[] }> {
  const client = getClient();
  if (!client) return { crypto: cryptoNews.slice(0, 5), ai: aiNews.slice(0, 5) };

  try {
    const allItems = [
      ...cryptoNews.map((a, i) => ({ ...a, _type: "crypto" as const, _idx: i })),
      ...aiNews.map((a, i) => ({ ...a, _type: "ai" as const, _idx: i })),
    ];

    const articleList = allItems
      .map((a, i) => `${i + 1}. [${a._type.toUpperCase()}] [${a.source}] ${a.title}\n   ${a.summary || "No description"}`)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You curate a daily crypto & AI briefing similar to TLDR Crypto. From these articles, select:
- TOP 5 CRYPTO stories: protocol updates, DeFi developments, regulatory moves, institutional adoption, major token events, on-chain trends. Skip price speculation articles and low-signal content.
- TOP 5 AI stories: breakthrough models, major funding rounds, significant product launches, AI regulation, enterprise AI adoption. Skip consumer gadget fluff.

For each, return its original index (1-based) and a punchy 1-sentence summary (max 20 words) that captures why it matters.

Return JSON: {"crypto": [{"index": 1, "summary": "..."}], "ai": [{"index": 2, "summary": "..."}]}. No markdown wrapping.

Articles:\n${articleList}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const result: { crypto: { index: number; summary: string }[]; ai: { index: number; summary: string }[] } = JSON.parse(text);

    const mapPicks = (picks: { index: number; summary: string }[]): NewsItem[] =>
      picks.slice(0, 5).map((pick) => {
        const item = allItems[pick.index - 1];
        if (!item) return null;
        return { title: item.title, source: item.source, url: item.url, publishedAt: item.publishedAt, summary: pick.summary } as NewsItem;
      }).filter((x) => x !== null) as NewsItem[];

    return {
      crypto: mapPicks(result.crypto || []),
      ai: mapPicks(result.ai || []),
    };
  } catch (error) {
    console.error("AI crypto/AI news filter failed:", error);
    return { crypto: cryptoNews.slice(0, 5), ai: aiNews.slice(0, 5) };
  }
}

export async function explainStockMoves(stocks: StockMover[]): Promise<StockMover[]> {
  const client = getClient();
  if (!client) return stocks;

  try {
    const movers = stocks
      .filter((s) => Math.abs(s.changePercent) > 1)
      .slice(0, 5);

    if (movers.length === 0) return stocks;

    const stockList = movers
      .map((s) => `${s.ticker} (${s.name}): ${s.changePercent > 0 ? "+" : ""}${s.changePercent.toFixed(2)}%`)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `For each stock, give a brief 1-sentence explanation of likely why it moved today. Be specific and reference recent events if possible. Return a JSON object mapping ticker to explanation string. No markdown.\n\nStocks:\n${stockList}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const explanations: Record<string, string> = JSON.parse(text);

    return stocks.map((s) => ({
      ...s,
      explanation: explanations[s.ticker] || undefined,
    }));
  } catch (error) {
    console.error("AI stock explanation failed:", error);
    return stocks;
  }
}

export async function generatePulsePicks(
  news: NewsItem[],
  crypto: CryptoAsset[],
  stocks: StockMover[]
): Promise<PulsePick[]> {
  const client = getClient();
  if (!client) return getMockPulsePicks();

  try {
    const context = `
TODAY'S MARKET CONTEXT:

Top News:
${news.slice(0, 5).map((n) => `- [${n.source}] ${n.title}`).join("\n")}

Crypto:
${crypto.slice(0, 5).map((c) => `- ${c.symbol}: $${c.price.toLocaleString()} (${c.change24h > 0 ? "+" : ""}${c.change24h.toFixed(1)}%)`).join("\n")}

Tech Stocks:
${stocks.slice(0, 8).map((s) => `- ${s.ticker}: $${s.price.toFixed(2)} (${s.changePercent > 0 ? "+" : ""}${s.changePercent.toFixed(2)}%)`).join("\n")}
    `.trim();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are a financial analyst assistant. Based on today's market data, generate 3 actionable watchlist picks. Consider momentum, sector trends, and news catalysts.

For each pick provide:
- ticker (stock or crypto symbol)
- action: one of "Watch", "Consider Buying", "Consider Selling", "Hold"
- reasoning: 2-3 sentences explaining why, referencing specific data points
- timeframe: "Short-term (1-2 weeks)", "Medium-term (1-3 months)", or "Long-term (3+ months)"
- riskLevel: "Low", "Medium", or "High"

Return a JSON array of objects. No markdown wrapping.

${context}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return JSON.parse(text);
  } catch (error) {
    console.error("AI pulse picks failed:", error);
    return getMockPulsePicks();
  }
}

function getMockPulsePicks(): PulsePick[] {
  return [
    {
      ticker: "NVDA",
      action: "Watch",
      reasoning: "Strong momentum in AI chip demand continues. Recent earnings beat expectations, but valuation is stretched. Wait for a pullback before entering.",
      timeframe: "Medium-term (1-3 months)",
      riskLevel: "Medium",
    },
    {
      ticker: "BTC",
      action: "Consider Buying",
      reasoning: "Bitcoin showing strength above key support levels. Institutional inflows via ETFs remain strong. Halving cycle dynamics remain favorable.",
      timeframe: "Long-term (3+ months)",
      riskLevel: "High",
    },
    {
      ticker: "GOOG",
      action: "Consider Buying",
      reasoning: "Trading at a relative discount to mega-cap peers. Gemini AI progress improving sentiment. Cloud revenue growth accelerating.",
      timeframe: "Medium-term (1-3 months)",
      riskLevel: "Low",
    },
  ];
}
