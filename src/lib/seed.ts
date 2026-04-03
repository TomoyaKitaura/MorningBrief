import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, "morningbrief.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

async function main() {
  // Upsert categories
  let aws = db.select().from(schema.categories).where(eq(schema.categories.slug, "aws")).get();
  if (!aws) {
    [aws] = db.insert(schema.categories).values({ name: "AWS", slug: "aws" }).returning().all();
  }

  let claude = db.select().from(schema.categories).where(eq(schema.categories.slug, "claude-code")).get();
  if (!claude) {
    [claude] = db.insert(schema.categories).values({ name: "Claude Code", slug: "claude-code" }).returning().all();
  }

  // Upsert sources
  const awsBlogExists = db.select().from(schema.sources)
    .where(eq(schema.sources.url, "https://aws.amazon.com/blogs/aws/feed/")).get();
  if (!awsBlogExists) {
    db.insert(schema.sources).values({
      categoryId: aws.id,
      name: "AWS公式ブログ",
      url: "https://aws.amazon.com/blogs/aws/feed/",
    }).run();
  }

  const awsWhatsNewExists = db.select().from(schema.sources)
    .where(eq(schema.sources.url, "https://aws.amazon.com/about-aws/whats-new/recent/feed/")).get();
  if (!awsWhatsNewExists) {
    db.insert(schema.sources).values({
      categoryId: aws.id,
      name: "AWS What's New",
      url: "https://aws.amazon.com/about-aws/whats-new/recent/feed/",
    }).run();
  }

  const anthropicExists = db.select().from(schema.sources)
    .where(eq(schema.sources.url, "https://www.anthropic.com/feed.xml")).get();
  if (!anthropicExists) {
    db.insert(schema.sources).values({
      categoryId: claude.id,
      name: "Anthropicブログ",
      url: "https://www.anthropic.com/feed.xml",
    }).run();
  }

  console.log("Seed data created successfully");
  sqlite.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
