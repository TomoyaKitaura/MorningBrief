import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles, sources, categories } from "@/lib/schema";
import { eq, isNull, lt } from "drizzle-orm";
import { collectFromSource } from "@/lib/collector";
import { summarizeArticles } from "@/lib/summarizer";

const BATCH_SIZE = 10;
const RETENTION_DAYS = 90;

export async function POST() {
  const enabledSources = db
    .select()
    .from(sources)
    .innerJoin(categories, eq(sources.categoryId, categories.id))
    .where(eq(sources.enabled, true))
    .all();

  let totalCollected = 0;
  let totalSummarized = 0;
  const errors: string[] = [];

  for (const row of enabledSources) {
    try {
      const items = await collectFromSource(row.sources.url);
      for (const item of items) {
        const existing = db.select().from(articles).where(eq(articles.externalId, item.externalId)).get();
        if (existing) continue;

        db.insert(articles).values({
          sourceId: row.sources.id,
          externalId: item.externalId,
          title: item.title,
          content: item.content,
          url: item.url,
          publishedAt: item.publishedAt.toISOString(),
        }).run();
        totalCollected++;
      }
    } catch (error) {
      const msg = `Failed to collect from ${row.sources.name}: ${error}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  // Summarize unsummarized articles (new + previously failed)
  const unsummarized = db
    .select()
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .innerJoin(categories, eq(sources.categoryId, categories.id))
    .where(isNull(articles.summary))
    .all();

  const byCategory = new Map<string, typeof unsummarized>();
  for (const row of unsummarized) {
    const catId = row.categories.id;
    if (!byCategory.has(catId)) byCategory.set(catId, []);
    byCategory.get(catId)!.push(row);
  }

  for (const [, articleRows] of byCategory) {
    for (let i = 0; i < articleRows.length; i += BATCH_SIZE) {
      const batch = articleRows.slice(i, i + BATCH_SIZE);
      try {
        const summaries = await summarizeArticles(
          batch.map((r) => ({
            externalId: r.articles.externalId,
            title: r.articles.title ?? undefined,
            content: r.articles.content,
          }))
        );
        for (const summary of summaries) {
          db.update(articles)
            .set({ summary: summary.summary, importance: summary.importance })
            .where(eq(articles.externalId, summary.externalId))
            .run();
          totalSummarized++;
        }
      } catch (error) {
        console.error(`Summarization batch failed: ${error}`);
        errors.push(`Summarization failed: ${error}`);
      }
    }
  }

  // Cleanup old articles
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const deleted = db.delete(articles).where(lt(articles.collectedAt, cutoff.toISOString())).returning().all();

  return NextResponse.json({
    collected: totalCollected,
    summarized: totalSummarized,
    deleted: deleted.length,
    errors,
  });
}
