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

  const claudeCodeReleasesExists = db.select().from(schema.sources)
    .where(eq(schema.sources.url, "https://github.com/anthropics/claude-code/releases.atom")).get();
  if (!claudeCodeReleasesExists) {
    db.insert(schema.sources).values({
      categoryId: claude.id,
      name: "Claude Code Releases",
      url: "https://github.com/anthropics/claude-code/releases.atom",
    }).run();
  }

  // SRE category
  let sre = db.select().from(schema.categories).where(eq(schema.categories.slug, "sre")).get();
  if (!sre) {
    [sre] = db.insert(schema.categories).values({ name: "SRE", slug: "sre" }).returning().all();
  }

  const sreSources = [
    { name: "Julia Evans", url: "https://jvns.ca/atom.xml" },
    { name: "Will Larson (Irrational Exuberance)", url: "https://lethain.com/feeds/" },
    { name: "Lorin Hochstein (Surfing Complexity)", url: "https://surfingcomplexity.blog/feed/" },
    { name: "Charity Majors", url: "https://charitydotwtf.substack.com/feed" },
    { name: "SRE Weekly", url: "https://sreweekly.com/feed/" },
    { name: "Fred Hebert", url: "https://ferd.ca/feed.rss" },
    { name: "Brendan Gregg", url: "https://www.brendangregg.com/blog/rss.xml" },
    { name: "Niall Murphy (RelyAbility)", url: "https://blog.relyabilit.ie/feed/" },
  ];

  for (const source of sreSources) {
    const exists = db.select().from(schema.sources)
      .where(eq(schema.sources.url, source.url)).get();
    if (!exists) {
      db.insert(schema.sources).values({
        categoryId: sre.id,
        name: source.name,
        url: source.url,
      }).run();
    }
  }

  // Security / Vulnerability category
  let security = db.select().from(schema.categories).where(eq(schema.categories.slug, "security")).get();
  if (!security) {
    [security] = db.insert(schema.categories).values({ name: "セキュリティ", slug: "security" }).returning().all();
  }

  const securitySources = [
    { name: "CISA Cybersecurity Advisories", url: "https://www.cisa.gov/cybersecurity-advisories/all.xml" },
    { name: "JPCERT/CC 注意喚起", url: "https://www.jpcert.or.jp/rss/jpcert.rdf" },
    { name: "JVN 脆弱性対策情報", url: "https://jvn.jp/rss/jvn.rdf" },
    { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
    { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
    { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" },
    { name: "piyolog", url: "https://piyolog.hatenadiary.jp/rss" },
    { name: "tl;dr sec", url: "https://tldrsec.com/feed.xml" },
    { name: "Google Project Zero", url: "https://googleprojectzero.blogspot.com/feeds/posts/default" },
  ];

  for (const source of securitySources) {
    const exists = db.select().from(schema.sources)
      .where(eq(schema.sources.url, source.url)).get();
    if (!exists) {
      db.insert(schema.sources).values({
        categoryId: security.id,
        name: source.name,
        url: source.url,
      }).run();
    }
  }

  // Clean up old invalid feed URL
  const oldAnthropicFeed = db.select().from(schema.sources)
    .where(eq(schema.sources.url, "https://www.anthropic.com/feed.xml")).get();
  if (oldAnthropicFeed) {
    db.delete(schema.sources).where(eq(schema.sources.url, "https://www.anthropic.com/feed.xml")).run();
  }

  console.log("Seed data created successfully");
  sqlite.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
