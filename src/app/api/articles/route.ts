import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles, sources, categories } from "@/lib/schema";
import { eq, desc, isNull, isNotNull, sql, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryId = searchParams.get("categoryId");
  const read = searchParams.get("read");
  const sortBy = searchParams.get("sortBy") || "importance";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const conditions = [];

  if (categoryId) {
    conditions.push(eq(sources.categoryId, categoryId));
  }

  if (read === "true") {
    conditions.push(isNotNull(articles.readAt));
  } else if (read === "false") {
    conditions.push(isNull(articles.readAt));
  }

  const orderByMap: Record<string, ReturnType<typeof desc>> = {
    publishedAt: desc(articles.publishedAt),
    collectedAt: desc(articles.collectedAt),
    importance: desc(articles.importance),
  };
  const orderByClause = orderByMap[sortBy] || orderByMap.importance;

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = db
    .select()
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .innerJoin(categories, eq(sources.categoryId, categories.id))
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset)
    .all();

  const [{ count: total }] = db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(whereClause)
    .all();

  const formatted = rows.map((r) => ({
    id: r.articles.id,
    title: r.articles.title,
    content: r.articles.content,
    url: r.articles.url,
    summary: r.articles.summary,
    importance: r.articles.importance,
    publishedAt: r.articles.publishedAt,
    collectedAt: r.articles.collectedAt,
    readAt: r.articles.readAt,
    source: { id: r.sources.id, name: r.sources.name },
    category: { id: r.categories.id, name: r.categories.name, slug: r.categories.slug },
  }));

  return NextResponse.json({ articles: formatted, total });
}
