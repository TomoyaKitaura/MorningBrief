import { POST } from "@/app/api/collect/route";
import { db } from "@/lib/db";
import { categories, sources, articles } from "@/lib/schema";
import { collectFromSource } from "@/lib/collector";
import { summarizeArticles } from "@/lib/summarizer";

jest.mock("@/lib/collector");
jest.mock("@/lib/summarizer");

const mockCollect = collectFromSource as jest.MockedFunction<typeof collectFromSource>;
const mockSummarize = summarizeArticles as jest.MockedFunction<typeof summarizeArticles>;

beforeEach(() => {
  db.delete(articles).run();
  db.delete(sources).run();
  db.delete(categories).run();

  mockCollect.mockResolvedValue([
    {
      title: "Test Article",
      url: "https://example.com/1",
      content: "Test content",
      externalId: "https://example.com/1",
      publishedAt: new Date("2026-04-03T00:00:00Z"),
    },
  ]);

  mockSummarize.mockResolvedValue([
    { externalId: "https://example.com/1", summary: "テスト要約", importance: 4 },
  ]);
});

describe("POST /api/collect", () => {
  it("collects articles and saves with summaries", async () => {
    const [category] = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning().all();
    db.insert(sources).values({ categoryId: category.id, name: "AWS Blog", url: "https://aws.amazon.com/blogs/aws/feed/" }).run();

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.collected).toBe(1);
    expect(data.summarized).toBe(1);

    const allArticles = db.select().from(articles).all();
    expect(allArticles).toHaveLength(1);
    expect(allArticles[0].summary).toBe("テスト要約");
    expect(allArticles[0].importance).toBe(4);
  });

  it("skips duplicate articles", async () => {
    const [category] = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning().all();
    const [source] = db.insert(sources).values({ categoryId: category.id, name: "AWS Blog", url: "https://aws.amazon.com/blogs/aws/feed/" }).returning().all();
    db.insert(articles).values({
      sourceId: source.id,
      externalId: "https://example.com/1",
      content: "Old content",
      url: "https://example.com/1",
      importance: 0,
      publishedAt: new Date().toISOString(),
    }).run();

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.collected).toBe(0);
  });
});
