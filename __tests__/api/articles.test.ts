import { GET } from "@/app/api/articles/route";
import { PATCH } from "@/app/api/articles/[id]/read/route";
import { db } from "@/lib/db";
import { categories, sources, articles } from "@/lib/schema";
import { NextRequest } from "next/server";

let sourceId: string;
let categoryId: string;

beforeEach(() => {
  db.delete(articles).run();
  db.delete(sources).run();
  db.delete(categories).run();
  const [category] = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning().all();
  categoryId = category.id;
  const [source] = db.insert(sources).values({ categoryId, name: "AWS Blog", url: "https://aws.amazon.com/blogs/aws/feed/" }).returning().all();
  sourceId = source.id;
});

describe("GET /api/articles", () => {
  it("returns articles sorted by importance descending", async () => {
    db.insert(articles).values([
      { sourceId, externalId: "url-1", content: "c1", url: "https://example.com/1", importance: 3, publishedAt: new Date().toISOString() },
      { sourceId, externalId: "url-2", content: "c2", url: "https://example.com/2", importance: 5, publishedAt: new Date().toISOString() },
    ]).run();
    const req = new NextRequest("http://localhost/api/articles");
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.articles).toHaveLength(2);
    expect(data.articles[0].importance).toBe(5);
    expect(data.total).toBe(2);
  });

  it("filters by categoryId", async () => {
    db.insert(articles).values({ sourceId, externalId: "url-1", content: "c", url: "https://example.com/1", importance: 3, publishedAt: new Date().toISOString() }).run();
    const req = new NextRequest(`http://localhost/api/articles?categoryId=${categoryId}`);
    const res = await GET(req);
    const data = await res.json();
    expect(data.articles).toHaveLength(1);
  });

  it("filters by read status", async () => {
    db.insert(articles).values({ sourceId, externalId: "url-1", content: "c", url: "https://example.com/1", importance: 3, publishedAt: new Date().toISOString(), readAt: new Date().toISOString() }).run();
    const req = new NextRequest("http://localhost/api/articles?read=false");
    const res = await GET(req);
    const data = await res.json();
    expect(data.articles).toHaveLength(0);
  });

  it("supports pagination", async () => {
    for (let i = 0; i < 3; i++) {
      db.insert(articles).values({ sourceId, externalId: `url-${i}`, content: `c-${i}`, url: `https://example.com/${i}`, importance: i, publishedAt: new Date().toISOString() }).run();
    }
    const req = new NextRequest("http://localhost/api/articles?limit=2&offset=0");
    const res = await GET(req);
    const data = await res.json();
    expect(data.articles).toHaveLength(2);
    expect(data.total).toBe(3);
  });
});

describe("PATCH /api/articles/[id]/read", () => {
  it("marks article as read", async () => {
    const [article] = db.insert(articles).values({ sourceId, externalId: "url-1", content: "c", url: "https://example.com/1", importance: 3, publishedAt: new Date().toISOString() }).returning().all();
    const req = new NextRequest(`http://localhost/api/articles/${article.id}/read`, { method: "PATCH" });
    const res = await PATCH(req, { params: Promise.resolve({ id: article.id }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.readAt).not.toBeNull();
  });
});
