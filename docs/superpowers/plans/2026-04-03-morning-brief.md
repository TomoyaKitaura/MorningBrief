# MorningBrief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local morning dashboard that aggregates tech news from RSS feeds, summarizes with Claude Code CLI, and presents in a clean web UI.

**Architecture:** Next.js App Router monolith with SQLite (Drizzle ORM). RSS collection triggered by OS cron via API Route. Claude Code CLI (`claude -p`) for AI summarization using Max subscription auth. Tailwind CSS for styling.

**Tech Stack:** Next.js 15, React 19, Drizzle ORM + better-sqlite3, Claude Code CLI, rss-parser, Tailwind CSS, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-03-morning-brief-design.md`

---

## File Structure

```
MorningBrief/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with Tailwind
│   │   ├── page.tsx               # Dashboard page
│   │   ├── settings/
│   │   │   └── page.tsx           # Settings page
│   │   └── api/
│   │       ├── collect/route.ts   # Collection pipeline endpoint
│   │       ├── articles/
│   │       │   ├── route.ts       # GET articles list
│   │       │   └── [id]/
│   │       │       └── read/route.ts  # PATCH mark as read
│   │       ├── categories/
│   │       │   ├── route.ts       # GET list, POST create
│   │       │   └── [id]/route.ts  # PATCH update, DELETE
│   │       └── sources/
│   │           ├── route.ts       # GET list, POST create
│   │           └── [id]/route.ts  # PATCH update, DELETE
│   ├── components/
│   │   ├── ArticleCard.tsx        # Single article display
│   │   ├── ArticleList.tsx        # Article list with pagination
│   │   ├── CategoryTabs.tsx       # Category filter tabs
│   │   ├── CategoryForm.tsx       # Category add/edit form
│   │   └── SourceForm.tsx         # Source add/edit form
│   ├── lib/
│   │   ├── schema.ts              # Drizzle schema definition
│   │   ├── db.ts                  # Drizzle client
│   │   ├── seed.ts                # Seed data
│   │   ├── collector.ts           # RSS feed fetcher
│   │   └── summarizer.ts          # Claude Code CLI wrapper
│   └── types/
│       └── index.ts               # Shared TypeScript types
├── drizzle/                       # Migration files (auto-generated)
├── drizzle.config.ts              # Drizzle Kit configuration
├── data/                          # SQLite database file
├── __tests__/
│   ├── lib/
│   │   ├── collector.test.ts      # RSS collector tests
│   │   └── summarizer.test.ts     # Summarizer tests
│   └── api/
│       ├── articles.test.ts       # Articles API tests
│       ├── categories.test.ts     # Categories API tests
│       ├── sources.test.ts        # Sources API tests
│       └── collect.test.ts        # Collection pipeline tests
├── jest.config.ts                 # Jest configuration
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── next.config.ts
```

---

## Task 1: Project Setup, Drizzle Schema & Jest Configuration

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `src/lib/schema.ts`, `src/lib/db.ts`
- Create: `drizzle.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx` (placeholder)
- Create: `src/types/index.ts`
- Create: `jest.config.ts`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/kagadminmac/src/github.com/TomoyaKitaura/MorningBrief
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Note: If prompted about existing files, confirm overwrite. The `docs/` directory will be preserved.

- [ ] **Step 2: Install dependencies**

```bash
npm install drizzle-orm better-sqlite3 rss-parser
npm install -D drizzle-kit @types/better-sqlite3 @types/node jest ts-jest @testing-library/react @testing-library/jest-dom tsx
```

- [ ] **Step 3: Configure Jest**

Create `jest.config.ts`:

```typescript
import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default createJestConfig(config);
```

Add test script to `package.json` scripts:

```json
"test": "jest"
```

- [ ] **Step 4: Create Drizzle schema**

Create `src/lib/schema.ts`:

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const articles = sqliteTable("articles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceId: text("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull().unique(),
  title: text("title"),
  content: text("content").notNull(),
  url: text("url").notNull(),
  summary: text("summary"),
  importance: integer("importance").notNull().default(0),
  publishedAt: text("published_at").notNull(),
  collectedAt: text("collected_at").notNull().default(sql`(datetime('now'))`),
  readAt: text("read_at"),
});
```

- [ ] **Step 5: Create Drizzle client**

Create `src/lib/db.ts`:

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "morningbrief.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
```

- [ ] **Step 6: Create Drizzle Kit configuration**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: "./data/morningbrief.db" },
});
```

- [ ] **Step 7: Create data directory and push schema**

```bash
mkdir -p data
npx drizzle-kit push
```

- [ ] **Step 8: Create shared types**

Create `src/types/index.ts`:

```typescript
export interface ArticleResponse {
  id: string;
  title: string | null;
  content: string;
  url: string;
  summary: string | null;
  importance: number;
  publishedAt: string;
  collectedAt: string;
  readAt: string | null;
  source: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface ArticlesListResponse {
  articles: ArticleResponse[];
  total: number;
}

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceResponse {
  id: string;
  categoryId: string;
  name: string;
  url: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 9: Add data/ to .gitignore**

Append to `.gitignore`:

```
data/
```

- [ ] **Step 10: Verify app starts and Jest runs**

```bash
npm run dev
```

In another terminal:

```bash
npm test -- --passWithNoTests
```

Expected: Both commands succeed without errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with Drizzle ORM + SQLite schema and Jest config"
```

---

## Task 2: Categories API

**Files:**
- Create: `src/app/api/categories/route.ts`
- Create: `src/app/api/categories/[id]/route.ts`
- Create: `__tests__/api/categories.test.ts`

- [ ] **Step 1: Write failing tests for categories API**

Create `__tests__/api/categories.test.ts`. Tests call route handler functions directly (no running server needed):

```typescript
import { GET, POST } from "@/app/api/categories/route";
import { PATCH, DELETE } from "@/app/api/categories/[id]/route";
import { db } from "@/lib/db";
import { categories, sources, articles } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

beforeEach(async () => {
  db.delete(articles).run();
  db.delete(sources).run();
  db.delete(categories).run();
});

describe("GET /api/categories", () => {
  it("returns empty array when no categories exist", async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns all categories sorted by name", async () => {
    db.insert(categories).values({ name: "Claude Code", slug: "claude-code" }).run();
    db.insert(categories).values({ name: "AWS", slug: "aws" }).run();
    const res = await GET();
    const data = await res.json();
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("AWS");
  });
});

describe("POST /api/categories", () => {
  it("creates a new category", async () => {
    const req = new NextRequest("http://localhost/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "AWS", slug: "aws" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.name).toBe("AWS");
    expect(data.slug).toBe("aws");
  });

  it("returns 400 for duplicate slug", async () => {
    db.insert(categories).values({ name: "AWS", slug: "aws" }).run();
    const req = new NextRequest("http://localhost/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "AWS 2", slug: "aws" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/categories/[id]", () => {
  it("updates category name", async () => {
    const [category] = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning();
    const req = new NextRequest(`http://localhost/api/categories/${category.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Amazon Web Services" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: category.id }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.name).toBe("Amazon Web Services");
  });
});

describe("DELETE /api/categories/[id]", () => {
  it("deletes a category and cascades", async () => {
    const [category] = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning();
    const req = new NextRequest(`http://localhost/api/categories/${category.id}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: category.id }) });
    expect(res.status).toBe(204);
    const [{ count }] = db.select({ count: sql<number>`count(*)` }).from(categories).all();
    expect(count).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/api/categories.test.ts
```

Expected: FAIL — route modules don't exist yet.

- [ ] **Step 3: Implement GET and POST categories**

Create `src/app/api/categories/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const result = db.select().from(categories).orderBy(asc(categories.name)).all();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, slug } = body;

  if (!name || !slug) {
    return NextResponse.json(
      { error: "name and slug are required" },
      { status: 400 }
    );
  }

  const existing = db.select().from(categories).where(eq(categories.slug, slug)).get();
  if (existing) {
    return NextResponse.json(
      { error: "slug already exists" },
      { status: 400 }
    );
  }

  const [category] = db.insert(categories).values({ name, slug }).returning();
  return NextResponse.json(category, { status: 201 });
}
```

- [ ] **Step 4: Implement PATCH and DELETE categories**

Create `src/app/api/categories/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, slug } = body;

  const data: { name?: string; slug?: string; updatedAt?: string } = {};
  if (name !== undefined) data.name = name;
  if (slug !== undefined) data.slug = slug;
  data.updatedAt = new Date().toISOString();

  const result = db.update(categories).set(data).where(eq(categories.id, id)).returning();
  if (result.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = db.delete(categories).where(eq(categories.id, id)).returning();
  if (result.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- __tests__/api/categories.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/categories/ __tests__/api/categories.test.ts
git commit -m "feat: add categories CRUD API routes"
```

---

## Task 3: Sources API

**Files:**
- Create: `src/app/api/sources/route.ts`
- Create: `src/app/api/sources/[id]/route.ts`
- Create: `__tests__/api/sources.test.ts`

- [ ] **Step 1: Write failing tests for sources API**

Create `__tests__/api/sources.test.ts`:

```typescript
import { GET, POST } from "@/app/api/sources/route";
import { PATCH, DELETE } from "@/app/api/sources/[id]/route";
import { db } from "@/lib/db";
import { categories, sources, articles } from "@/lib/schema";
import { NextRequest } from "next/server";

let categoryId: string;

beforeEach(async () => {
  db.delete(articles).run();
  db.delete(sources).run();
  db.delete(categories).run();
  const [category] = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning();
  categoryId = category.id;
});

describe("GET /api/sources", () => {
  it("returns sources filtered by categoryId", async () => {
    db.insert(sources).values({ categoryId, name: "AWS Blog", url: "https://aws.amazon.com/blogs/aws/feed/" }).run();
    const req = new NextRequest(`http://localhost/api/sources?categoryId=${categoryId}`);
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("AWS Blog");
  });
});

describe("POST /api/sources", () => {
  it("creates a new source", async () => {
    const req = new NextRequest("http://localhost/api/sources", {
      method: "POST",
      body: JSON.stringify({
        categoryId,
        name: "AWS Blog",
        url: "https://aws.amazon.com/blogs/aws/feed/",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.name).toBe("AWS Blog");
    expect(data.enabled).toBe(true);
  });
});

describe("PATCH /api/sources/[id]", () => {
  it("toggles enabled flag", async () => {
    const [source] = db.insert(sources).values({ categoryId, name: "AWS Blog", url: "https://aws.amazon.com/blogs/aws/feed/" }).returning();
    const req = new NextRequest(`http://localhost/api/sources/${source.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: false }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: source.id }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.enabled).toBe(false);
  });
});

describe("DELETE /api/sources/[id]", () => {
  it("deletes a source", async () => {
    const [source] = db.insert(sources).values({ categoryId, name: "AWS Blog", url: "https://aws.amazon.com/blogs/aws/feed/" }).returning();
    const req = new NextRequest(`http://localhost/api/sources/${source.id}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: source.id }) });
    expect(res.status).toBe(204);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/api/sources.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement GET and POST sources**

Create `src/app/api/sources/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources, categories } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("categoryId");
  let query = db.select().from(sources);
  if (categoryId) {
    query = query.where(eq(sources.categoryId, categoryId));
  }
  const result = query.orderBy(asc(sources.name)).all();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { categoryId, name, url } = body;

  if (!categoryId || !name || !url) {
    return NextResponse.json(
      { error: "categoryId, name, and url are required" },
      { status: 400 }
    );
  }

  const [source] = db.insert(sources).values({ categoryId, name, url }).returning();
  return NextResponse.json(source, { status: 201 });
}
```

- [ ] **Step 4: Implement PATCH and DELETE sources**

Create `src/app/api/sources/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, url, enabled } = body;

  const data: { name?: string; url?: string; enabled?: boolean; updatedAt?: string } = {};
  if (name !== undefined) data.name = name;
  if (url !== undefined) data.url = url;
  if (enabled !== undefined) data.enabled = enabled;
  data.updatedAt = new Date().toISOString();

  const result = db.update(sources).set(data).where(eq(sources.id, id)).returning();
  if (result.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = db.delete(sources).where(eq(sources.id, id)).returning();
  if (result.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- __tests__/api/sources.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/sources/ __tests__/api/sources.test.ts
git commit -m "feat: add sources CRUD API routes"
```

---

## Task 4: Articles API

**Files:**
- Create: `src/app/api/articles/route.ts`
- Create: `src/app/api/articles/[id]/read/route.ts`
- Create: `__tests__/api/articles.test.ts`

- [ ] **Step 1: Write failing tests for articles API**

Create `__tests__/api/articles.test.ts`:

```typescript
import { GET } from "@/app/api/articles/route";
import { PATCH } from "@/app/api/articles/[id]/read/route";
import { db } from "@/lib/db";
import { categories, sources, articles } from "@/lib/schema";
import { NextRequest } from "next/server";

let sourceId: string;
let categoryId: string;

beforeEach(async () => {
  db.delete(articles).run();
  db.delete(sources).run();
  db.delete(categories).run();
  const [category] = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning();
  categoryId = category.id;
  const [source] = db.insert(sources).values({ categoryId, name: "AWS Blog", url: "https://aws.amazon.com/blogs/aws/feed/" }).returning();
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
    const [article] = db.insert(articles).values({ sourceId, externalId: "url-1", content: "c", url: "https://example.com/1", importance: 3, publishedAt: new Date().toISOString() }).returning();
    const req = new NextRequest(`http://localhost/api/articles/${article.id}/read`, { method: "PATCH" });
    const res = await PATCH(req, { params: Promise.resolve({ id: article.id }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.readAt).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/api/articles.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement GET articles**

Create `src/app/api/articles/route.ts`:

```typescript
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

  const orderByMap = {
    publishedAt: desc(articles.publishedAt),
    collectedAt: desc(articles.collectedAt),
    importance: desc(articles.importance),
  };
  const orderByClause = orderByMap[sortBy as keyof typeof orderByMap] || orderByMap.importance;

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
```

- [ ] **Step 4: Implement PATCH mark as read**

Create `src/app/api/articles/[id]/read/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [article] = db.update(articles).set({ readAt: new Date().toISOString() }).where(eq(articles.id, id)).returning();
  return NextResponse.json(article);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- __tests__/api/articles.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/articles/ __tests__/api/articles.test.ts
git commit -m "feat: add articles API with filtering, sorting, and pagination"
```

---

## Task 5: RSS Collector

**Files:**
- Create: `src/lib/collector.ts`
- Create: `__tests__/lib/collector.test.ts`

- [ ] **Step 1: Write failing tests for RSS collector**

Create `__tests__/lib/collector.test.ts`:

```typescript
import { collectFromSource } from "@/lib/collector";

jest.mock("rss-parser", () => {
  return jest.fn().mockImplementation(() => ({
    parseURL: jest.fn().mockResolvedValue({
      items: [
        {
          title: "New Lambda Feature",
          link: "https://aws.amazon.com/blogs/1",
          content: "AWS Lambda now supports new runtime...",
          isoDate: "2026-04-03T00:00:00Z",
        },
        {
          title: "S3 Update",
          link: "https://aws.amazon.com/blogs/2",
          content: "Amazon S3 introduces new storage class...",
          isoDate: "2026-04-02T00:00:00Z",
        },
      ],
    }),
  }));
});

describe("collectFromSource", () => {
  it("fetches and parses RSS feed items", async () => {
    const items = await collectFromSource("https://aws.amazon.com/blogs/aws/feed/");
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      title: "New Lambda Feature",
      url: "https://aws.amazon.com/blogs/1",
      content: "AWS Lambda now supports new runtime...",
      externalId: "https://aws.amazon.com/blogs/1",
      publishedAt: new Date("2026-04-03T00:00:00Z"),
    });
  });

  it("truncates content to 2000 characters", async () => {
    const RssParser = require("rss-parser");
    const mockInstance = new RssParser();
    mockInstance.parseURL.mockResolvedValueOnce({
      items: [
        {
          title: "Long Article",
          link: "https://example.com/long",
          content: "x".repeat(3000),
          isoDate: "2026-04-03T00:00:00Z",
        },
      ],
    });
    const items = await collectFromSource("https://example.com/feed");
    expect(items[0].content.length).toBeLessThanOrEqual(2000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/collector.test.ts
```

Expected: FAIL — `collectFromSource` doesn't exist.

- [ ] **Step 3: Implement RSS collector**

Create `src/lib/collector.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/collector.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/collector.ts __tests__/lib/collector.test.ts
git commit -m "feat: add RSS feed collector with content truncation"
```

---

## Task 6: Claude Code CLI Summarizer

**Files:**
- Create: `src/lib/summarizer.ts`
- Create: `__tests__/lib/summarizer.test.ts`

- [ ] **Step 1: Write failing tests for summarizer**

Create `__tests__/lib/summarizer.test.ts`:

```typescript
import { buildPrompt } from "@/lib/summarizer";

describe("buildPrompt", () => {
  it("builds prompt with article data", () => {
    const articles = [
      { externalId: "https://example.com/1", title: "Test Article", content: "Some content" },
    ];
    const prompt = buildPrompt(articles);
    expect(prompt).toContain("技術情報アナリスト");
    expect(prompt).toContain("https://example.com/1");
    expect(prompt).toContain("Test Article");
  });

  it("includes all articles in prompt", () => {
    const articles = [
      { externalId: "url-1", title: "Article 1", content: "Content 1" },
      { externalId: "url-2", title: "Article 2", content: "Content 2" },
    ];
    const prompt = buildPrompt(articles);
    expect(prompt).toContain("url-1");
    expect(prompt).toContain("url-2");
  });

  it("handles articles with no title", () => {
    const articles = [
      { externalId: "url-1", title: undefined, content: "Content" },
    ];
    const prompt = buildPrompt(articles);
    expect(prompt).toContain("(no title)");
  });
});
```

Note: `summarizeArticles` invokes `claude` CLI which requires auth. We test `buildPrompt` directly (pure function, no mocking needed) and mock `summarizeArticles` in integration tests (Task 7).

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/summarizer.test.ts
```

Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement summarizer**

Create `src/lib/summarizer.ts`:

```typescript
import { execFile as execFileCb } from "child_process";
import { promisify } from "util";

const execFile = promisify(execFileCb);

interface ArticleInput {
  externalId: string;
  title: string | undefined;
  content: string;
}

export interface SummaryResult {
  externalId: string;
  summary: string;
  importance: number;
}

export function buildPrompt(articles: ArticleInput[]): string {
  const articleData = JSON.stringify(
    articles.map((a) => ({
      externalId: a.externalId,
      title: a.title || "(no title)",
      content: a.content,
    })),
    null,
    2
  );

  return `あなたは技術情報アナリストです。以下の技術記事を分析してください。

各記事について以下を返してください：
1. 日本語での要約（1-2文、技術者向け）
2. 重要度スコア（1-5）

重要度の基準：
- 5: 破壊的変更、重大なセキュリティ更新、主要な新機能リリース
- 4: 重要な機能追加、パフォーマンス改善、非推奨化の通知
- 3: 一般的な機能更新、ツールの改善
- 2: マイナーな修正、ドキュメント更新
- 1: コミュニティ記事、イベント告知

以下のJSON形式のみ返してください（それ以外のテキストは不要）：
[
  {
    "externalId": "記事の識別子",
    "summary": "日本語の要約",
    "importance": 数値
  }
]

## 記事データ

${articleData}`;
}

export async function summarizeArticles(
  articles: ArticleInput[]
): Promise<SummaryResult[]> {
  if (articles.length === 0) return [];

  const prompt = buildPrompt(articles);

  try {
    const { stdout } = await execFile(
      "claude",
      ["-p", prompt, "--output-format", "json"],
      { maxBuffer: 10 * 1024 * 1024, timeout: 120000 }
    );

    const cliResponse = JSON.parse(stdout);
    const resultText =
      typeof cliResponse.result === "string"
        ? cliResponse.result
        : JSON.stringify(cliResponse.result);

    const jsonMatch = resultText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const results: SummaryResult[] = JSON.parse(jsonMatch[0]);
    return results.filter(
      (r) => r.externalId && r.summary && typeof r.importance === "number"
    );
  } catch (error) {
    console.error("Claude CLI summarization failed:", error);
    return [];
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/summarizer.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/summarizer.ts __tests__/lib/summarizer.test.ts
git commit -m "feat: add Claude Code CLI summarizer with prompt builder"
```

---

## Task 7: Collection Pipeline API Route

**Files:**
- Create: `src/app/api/collect/route.ts`
- Create: `__tests__/api/collect.test.ts`

- [ ] **Step 1: Write failing tests for collection pipeline**

Create `__tests__/api/collect.test.ts`:

```typescript
import { POST } from "@/app/api/collect/route";
import { db } from "@/lib/db";
import { categories, sources, articles } from "@/lib/schema";
import { collectFromSource } from "@/lib/collector";
import { summarizeArticles } from "@/lib/summarizer";

jest.mock("@/lib/collector");
jest.mock("@/lib/summarizer");

const mockCollect = collectFromSource as jest.MockedFunction<typeof collectFromSource>;
const mockSummarize = summarizeArticles as jest.MockedFunction<typeof summarizeArticles>;

beforeEach(async () => {
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
    const [category] = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning();
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
    const [category] = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning();
    const [source] = db.insert(sources).values({ categoryId: category.id, name: "AWS Blog", url: "https://aws.amazon.com/blogs/aws/feed/" }).returning();
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/api/collect.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement collection pipeline**

Create `src/app/api/collect/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles, sources, categories } from "@/lib/schema";
import { eq, isNull, lt, and } from "drizzle-orm";
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

  // Collect articles from each source
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
  const deleted = db.delete(articles).where(lt(articles.collectedAt, cutoff.toISOString())).returning();

  return NextResponse.json({
    collected: totalCollected,
    summarized: totalSummarized,
    deleted: deleted.length,
    errors,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/api/collect.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/collect/ __tests__/api/collect.test.ts
git commit -m "feat: add collection pipeline with RSS fetch, summarization, and cleanup"
```

---

## Task 8: Dashboard Page

**Files:**
- Create: `src/components/ArticleCard.tsx`
- Create: `src/components/ArticleList.tsx`
- Create: `src/components/CategoryTabs.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create ArticleCard component**

Create `src/components/ArticleCard.tsx`:

```tsx
"use client";

import { ArticleResponse } from "@/types";

function ImportanceStars({ level }: { level: number }) {
  return (
    <span className="text-yellow-500" aria-label={`重要度 ${level}`}>
      {"★".repeat(level)}{"☆".repeat(5 - level)}
    </span>
  );
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "1時間以内";
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

export default function ArticleCard({
  article,
  onMarkRead,
}: {
  article: ArticleResponse;
  onMarkRead: (id: string) => void;
}) {
  const isUnread = !article.readAt;

  const handleClick = () => {
    if (isUnread) onMarkRead(article.id);
    window.open(article.url, "_blank");
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
        isUnread ? "bg-white" : "bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ImportanceStars level={article.importance} />
            <h3 className={`text-base ${isUnread ? "font-bold text-gray-900" : "text-gray-600"}`}>
              {article.title || article.summary || "(no title)"}
            </h3>
          </div>
          {article.summary && (
            <p className="text-sm text-gray-600 mb-1">要約: {article.summary}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{article.source.name}</span>
            <span>·</span>
            <span>{timeAgo(article.publishedAt)}</span>
          </div>
        </div>
        <span className="text-blue-500 text-sm ml-4 shrink-0">元記事→</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ArticleList component**

Create `src/components/ArticleList.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import ArticleCard from "./ArticleCard";
import { ArticleResponse } from "@/types";

const PAGE_SIZE = 50;

export default function ArticleList({ categoryId }: { categoryId: string | null }) {
  const [articles, setArticles] = useState<ArticleResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));

    const res = await fetch(`/api/articles?${params}`);
    const data = await res.json();
    setArticles(data.articles);
    setTotal(data.total);
    setLoading(false);
  }, [categoryId, offset]);

  useEffect(() => { setOffset(0); }, [categoryId]);
  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/articles/${id}/read`, { method: "PATCH" });
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, readAt: new Date().toISOString() } : a))
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-400">読み込み中...</div>;
  if (articles.length === 0) return <div className="p-8 text-center text-gray-400">記事がありません</div>;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} onMarkRead={handleMarkRead} />
      ))}
      {totalPages > 1 && (
        <div className="flex justify-center gap-4 p-4">
          <button onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={offset === 0} className="px-3 py-1 text-sm border rounded disabled:opacity-30">前へ</button>
          <span className="text-sm text-gray-500 self-center">{currentPage} / {totalPages}</span>
          <button onClick={() => setOffset(offset + PAGE_SIZE)} disabled={currentPage >= totalPages} className="px-3 py-1 text-sm border rounded disabled:opacity-30">次へ</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create CategoryTabs component**

Create `src/components/CategoryTabs.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CategoryResponse } from "@/types";

export default function CategoryTabs({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 px-4 overflow-x-auto">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
          selectedId === null ? "border-blue-500 text-blue-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        全て
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
            selectedId === cat.id ? "border-blue-500 text-blue-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {cat.name}
        </button>
      ))}
      <Link href="/settings" className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 whitespace-nowrap">
        + 追加
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Update Dashboard page**

Replace `src/app/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import CategoryTabs from "@/components/CategoryTabs";
import ArticleList from "@/components/ArticleList";

export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [lastCollected, setLastCollected] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the most recently collected article's collectedAt as "last updated" time
    fetch("/api/articles?limit=1&sortBy=collectedAt")
      .then((r) => r.json())
      .then((data) => {
        if (data.articles.length > 0) {
          const date = new Date(data.articles[0].collectedAt);
          setLastCollected(date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }));
        }
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">MorningBrief</h1>
          {lastCollected && (
            <span className="text-sm text-gray-400">最終更新: {lastCollected}</span>
          )}
        </div>
      </header>
      <main className="max-w-4xl mx-auto bg-white mt-0 shadow-sm">
        <CategoryTabs selectedId={selectedCategory} onSelect={setSelectedCategory} />
        <ArticleList categoryId={selectedCategory} />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Update root layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MorningBrief",
  description: "技術情報キャッチアップ用モーニングダッシュボード",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Verify the dashboard renders**

```bash
npm run dev
```

Open http://localhost:3000 — header with "MorningBrief", category tabs, "記事がありません" message.

- [ ] **Step 7: Commit**

```bash
git add src/components/ArticleCard.tsx src/components/ArticleList.tsx src/components/CategoryTabs.tsx src/app/page.tsx src/app/layout.tsx
git commit -m "feat: add dashboard page with article cards, category tabs, and pagination"
```

---

## Task 9: Settings Page

**Files:**
- Create: `src/components/CategoryForm.tsx`
- Create: `src/components/SourceForm.tsx`
- Create: `src/app/settings/page.tsx`

- [ ] **Step 1: Create CategoryForm component**

Create `src/components/CategoryForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { CategoryResponse } from "@/types";

export default function CategoryForm({
  categories,
  onUpdate,
}: {
  categories: CategoryResponse[];
  onUpdate: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });
    setName("");
    setSlug("");
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このカテゴリを削除しますか？配下のソース・記事もすべて削除されます。")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    onUpdate();
  };

  const handleEdit = async (id: string) => {
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setEditingId(null);
    onUpdate();
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">カテゴリ</h2>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="カテゴリ名" className="border rounded px-3 py-1.5 text-sm flex-1" />
        <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" className="border rounded px-3 py-1.5 text-sm w-32" />
        <button type="submit" className="bg-blue-500 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-600">追加</button>
      </form>
      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat.id} className="flex items-center justify-between border rounded p-2">
            {editingId === cat.id ? (
              <div className="flex gap-2 flex-1">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" />
                <button onClick={() => handleEdit(cat.id)} className="text-blue-500 text-sm">保存</button>
                <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm">キャンセル</button>
              </div>
            ) : (
              <>
                <span className="text-sm">{cat.name} <span className="text-gray-400">({cat.slug})</span></span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="text-blue-500 text-sm">編集</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-red-500 text-sm">削除</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Create SourceForm component**

Create `src/components/SourceForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { CategoryResponse, SourceResponse } from "@/types";

export default function SourceForm({
  categories,
  sources,
  onUpdate,
}: {
  categories: CategoryResponse[];
  sources: SourceResponse[];
  onUpdate: () => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !name || !url) return;
    await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, name, url }),
    });
    setName("");
    setUrl("");
    onUpdate();
  };

  const handleToggle = async (source: SourceResponse) => {
    await fetch(`/api/sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !source.enabled }),
    });
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このソースを削除しますか？")) return;
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    onUpdate();
  };

  const sourcesByCategory = new Map<string, SourceResponse[]>();
  for (const source of sources) {
    if (!sourcesByCategory.has(source.categoryId)) sourcesByCategory.set(source.categoryId, []);
    sourcesByCategory.get(source.categoryId)!.push(source);
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-3">ソース（RSSフィード）</h2>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4 flex-wrap">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
          <option value="">カテゴリ選択</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ソース名" className="border rounded px-3 py-1.5 text-sm" />
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="RSSフィードURL" className="border rounded px-3 py-1.5 text-sm flex-1" />
        <button type="submit" className="bg-blue-500 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-600">追加</button>
      </form>
      {categories.map((cat) => {
        const catSources = sourcesByCategory.get(cat.id) || [];
        if (catSources.length === 0) return null;
        return (
          <div key={cat.id} className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{cat.name}</h3>
            <ul className="space-y-1">
              {catSources.map((source) => (
                <li key={source.id} className="flex items-center justify-between border rounded p-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(source)} className={`w-8 h-5 rounded-full transition-colors ${source.enabled ? "bg-green-500" : "bg-gray-300"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${source.enabled ? "translate-x-3.5" : "translate-x-0.5"}`} />
                    </button>
                    <span className="text-sm">{source.name}</span>
                    <span className="text-xs text-gray-400 truncate max-w-xs">{source.url}</span>
                  </div>
                  <button onClick={() => handleDelete(source.id)} className="text-red-500 text-sm">削除</button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create Settings page**

Create `src/app/settings/page.tsx`:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import CategoryForm from "@/components/CategoryForm";
import SourceForm from "@/components/SourceForm";
import { CategoryResponse, SourceResponse } from "@/types";

export default function SettingsPage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [sources, setSources] = useState<SourceResponse[]>([]);

  const fetchData = useCallback(async () => {
    const [catRes, srcRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/sources"),
    ]);
    setCategories(await catRes.json());
    setSources(await srcRes.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-blue-500 text-sm">← ダッシュボード</Link>
          <h1 className="text-xl font-bold text-gray-900">設定</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto mt-6 space-y-6">
        <section className="bg-white rounded-lg shadow-sm p-6">
          <CategoryForm categories={categories} onUpdate={fetchData} />
        </section>
        <section className="bg-white rounded-lg shadow-sm p-6">
          <SourceForm categories={categories} sources={sources} onUpdate={fetchData} />
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Verify settings page renders**

```bash
npm run dev
```

Open http://localhost:3000/settings — category and source forms visible.

- [ ] **Step 5: Commit**

```bash
git add src/components/CategoryForm.tsx src/components/SourceForm.tsx src/app/settings/
git commit -m "feat: add settings page with category and source management"
```

---

## Task 10: Seed Data & End-to-End Verification

**Files:**
- Create: `src/lib/seed.ts`
- Modify: `package.json` (add seed script)

- [ ] **Step 1: Create seed script**

Create `src/lib/seed.ts`:

```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";
import { categories, sources } from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "morningbrief.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite, { schema });

function main() {
  // Upsert categories
  let aws = db.select().from(categories).where(eq(categories.slug, "aws")).get();
  if (!aws) {
    [aws] = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning();
  }

  let claude = db.select().from(categories).where(eq(categories.slug, "claude-code")).get();
  if (!claude) {
    [claude] = db.insert(categories).values({ name: "Claude Code", slug: "claude-code" }).returning();
  }

  // Upsert sources
  const awsBlogExists = db.select().from(sources).where(
    and(eq(sources.categoryId, aws.id), eq(sources.url, "https://aws.amazon.com/blogs/aws/feed/"))
  ).get();
  if (!awsBlogExists) {
    db.insert(sources).values({ categoryId: aws.id, name: "AWS公式ブログ", url: "https://aws.amazon.com/blogs/aws/feed/" }).run();
  }

  const awsWhatsNewExists = db.select().from(sources).where(
    and(eq(sources.categoryId, aws.id), eq(sources.url, "https://aws.amazon.com/about-aws/whats-new/recent/feed/"))
  ).get();
  if (!awsWhatsNewExists) {
    db.insert(sources).values({ categoryId: aws.id, name: "AWS What's New", url: "https://aws.amazon.com/about-aws/whats-new/recent/feed/" }).run();
  }

  const anthropicExists = db.select().from(sources).where(
    and(eq(sources.categoryId, claude.id), eq(sources.url, "https://www.anthropic.com/feed.xml"))
  ).get();
  if (!anthropicExists) {
    db.insert(sources).values({ categoryId: claude.id, name: "Anthropicブログ", url: "https://www.anthropic.com/feed.xml" }).run();
  }

  console.log("Seed data created successfully");
}

main();
```

- [ ] **Step 2: Add seed script to package.json**

Add to `package.json` scripts:

```json
"seed": "npx tsx src/lib/seed.ts"
```

- [ ] **Step 3: Run seed**

```bash
npm run seed
```

Expected: "Seed data created successfully"

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Run the full app and verify end-to-end**

```bash
npm run dev
```

Verify:
1. http://localhost:3000 — Dashboard with category tabs (AWS, Claude Code)
2. http://localhost:3000/settings — Categories and sources listed
3. Trigger collection:
   ```bash
   curl -X POST http://localhost:3000/api/collect
   ```
4. Refresh dashboard — articles appear with AI summaries and importance stars

- [ ] **Step 6: Build production**

```bash
npm run build && npm start
```

Verify app works at http://localhost:3000.

- [ ] **Step 7: Commit**

```bash
git add src/lib/seed.ts package.json
git commit -m "feat: add seed data and complete end-to-end verification"
```
