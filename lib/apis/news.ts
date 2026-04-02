import { NewsItem } from "../types";

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
  creator?: string;
  source?: { name?: string };
}

const RSS_FEEDS = {
  global: [
    { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC" },
    { url: "https://feeds.reuters.com/reuters/topNews", source: "Reuters" },
    { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera" },
    { url: "https://apnews.com/index.rss", source: "AP News" },
  ],
  crypto: [
    { url: "https://cointelegraph.com/rss", source: "CoinTelegraph" },
    { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
    { url: "https://decrypt.co/feed", source: "Decrypt" },
    { url: "https://thedefiant.io/feed", source: "The Defiant" },
  ],
  ai: [
    { url: "https://techcrunch.com/category/artificial-intelligence/feed/", source: "TechCrunch" },
    { url: "https://feeds.arstechnica.com/arstechnica/technology-lab", source: "Ars Technica" },
    { url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", source: "The Verge" },
  ],
};

async function fetchRSSFeed(feedUrl: string, sourceName: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "Pulse Dashboard/1.0" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const text = await res.text();
    const items = parseRSSXml(text);

    return items.slice(0, 5).map((item) => ({
      title: item.title || "Untitled",
      source: sourceName,
      url: item.link || "",
      publishedAt: item.pubDate || new Date().toISOString(),
      summary: item.contentSnippet?.slice(0, 200),
    }));
  } catch {
    return [];
  }
}

function parseRSSXml(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");
    const description = extractTag(itemXml, "description");

    items.push({
      title: cleanHtml(title),
      link,
      pubDate,
      contentSnippet: cleanHtml(description),
    });
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export async function fetchGlobalNews(): Promise<NewsItem[]> {
  const results = await Promise.all(
    RSS_FEEDS.global.map((feed) => fetchRSSFeed(feed.url, feed.source))
  );

  // Fetch more than needed so AI can filter for relevance
  return results
    .flat()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 15);
}

export async function fetchCryptoNews(): Promise<NewsItem[]> {
  const results = await Promise.all(
    RSS_FEEDS.crypto.map((feed) => fetchRSSFeed(feed.url, feed.source))
  );

  // Fetch more than needed so AI can filter for quality
  return results
    .flat()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 15);
}

export async function fetchAINews(): Promise<NewsItem[]> {
  const results = await Promise.all(
    RSS_FEEDS.ai.map((feed) => fetchRSSFeed(feed.url, feed.source))
  );

  // Fetch more than needed so AI can filter for quality
  return results
    .flat()
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 15);
}
