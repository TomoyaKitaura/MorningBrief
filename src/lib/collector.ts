import RssParser from "rss-parser";

const parser = new RssParser();
const MAX_CONTENT_LENGTH = 2000;

export interface CollectedItem {
  title: string | undefined;
  url: string;
  content: string;
  externalId: string;
  publishedAt: Date;
}

export async function collectFromSource(feedUrl: string): Promise<CollectedItem[]> {
  const feed = await parser.parseURL(feedUrl);

  return feed.items
    .filter((item) => item.link)
    .map((item) => ({
      title: item.title,
      url: item.link!,
      content: (item.content || item.contentSnippet || "").slice(0, MAX_CONTENT_LENGTH),
      externalId: item.link!,
      publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
    }));
}
