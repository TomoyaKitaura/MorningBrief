# MorningBrief Design Spec

## Overview

A personal morning dashboard web app for catching up on tech news. Aggregates information from X (Twitter) accounts and official release feeds (RSS), summarizes articles using Claude API, and presents them sorted by importance.

Runs locally as a single Next.js process with SQLite for storage.

## Requirements

- **Tech info catch-up**: Aggregate updates from X accounts and official sources (AWS, Claude Code, etc.)
- **Flexible categories**: Easy to add/remove categories and sources via a settings UI
- **AI summaries**: Each article gets a 1-2 sentence Japanese summary and importance score (1-5) via Claude API (Sonnet 4.6)
- **Scheduled collection**: cron job runs daily at 7:00 AM, hitting a local API route
- **Local deployment**: Runs on the user's machine, no cloud hosting
- **Human-readable**: Clean web UI with category filtering and importance sorting

## Architecture

```
Next.js App (single process)
├── React UI (App Router)
├── API Routes (collect, articles, categories, sources)
├── SQLite via Prisma
└── Collection pipeline (X API, RSS)
    └── Claude API for summarization
```

OS cron calls `POST /api/collect` at 7:00 AM daily. The collection pipeline fetches new posts/articles, deduplicates by externalId, and sends them to Claude API for summarization and importance scoring.

## Data Model

### Category

| Field     | Type     | Description                        |
|-----------|----------|------------------------------------|
| id        | String   | UUID                               |
| name      | String   | Display name ("AWS", "Claude Code") |
| slug      | String   | URL-safe identifier                |
| createdAt | DateTime |                                    |
| updatedAt | DateTime |                                    |

### Source

| Field      | Type     | Description                              |
|------------|----------|------------------------------------------|
| id         | String   | UUID                                     |
| categoryId | String   | FK to Category                           |
| type       | Enum     | TWITTER, RSS, RELEASE_PAGE               |
| name       | String   | Display name ("@awscloud", "Anthropic Blog") |
| url        | String   | X user ID, RSS feed URL, etc.            |
| enabled    | Boolean  | Toggle source on/off                     |
| createdAt  | DateTime |                                          |
| updatedAt  | DateTime |                                          |

### Article

| Field       | Type      | Description                          |
|-------------|-----------|--------------------------------------|
| id          | String    | UUID                                 |
| sourceId    | String    | FK to Source                         |
| externalId  | String    | Deduplication key (tweet ID, URL)    |
| title       | String?   | Article title (nullable for tweets)  |
| content     | String    | Original text                        |
| url         | String    | Link to original                     |
| summary     | String?   | AI-generated Japanese summary        |
| importance  | Int       | 1-5, AI-assigned importance score    |
| publishedAt | DateTime  | Original publish time                |
| collectedAt | DateTime  | When we fetched it                   |
| readAt      | DateTime? | Null = unread                        |

### Relationships

- Category 1:N Source
- Source 1:N Article

## Collection Pipeline

### Flow

1. `POST /api/collect` triggered by cron
2. Fetch all enabled Sources from DB
3. For each source type:
   - **TWITTER**: X API v2 — fetch latest tweets from user timeline
   - **RSS**: `rss-parser` — fetch and parse feed items
   - **RELEASE_PAGE**: Treated as RSS (most official release pages provide RSS)
4. Deduplicate by `externalId`, save only new articles
5. Batch new articles by category, send to Claude API (Sonnet 4.6)
6. Claude generates Japanese summary (1-2 sentences) and importance score (1-5) per article
7. Save summaries and scores to DB

### X API Free Plan Constraints

- Monthly limit: 1,500 post reads
- Strategy: 10-15 accounts, 3-5 tweets each per collection run
- ~50 posts/day, ~1,500/month
- Sources can be disabled via `enabled` flag to stay within budget

### Claude API Usage

- Model: `claude-sonnet-4-6`
- Batch by category to reduce API calls
- Prompt: Summarize each article in Japanese (1-2 sentences), assign importance 1-5 for a tech professional

### Example Sources

| Category    | Type    | Source                         |
|-------------|---------|--------------------------------|
| AWS         | TWITTER | @awscloud                      |
| AWS         | RSS     | aws.amazon.com/blogs RSS       |
| Claude Code | TWITTER | @AnthropicAI                   |
| Claude Code | RSS     | Anthropic official blog RSS    |

## API Routes

| Method | Path                       | Purpose                              |
|--------|----------------------------|--------------------------------------|
| POST   | `/api/collect`             | Run collection pipeline              |
| GET    | `/api/articles`            | List articles (category/read filter) |
| PATCH  | `/api/articles/[id]/read`  | Mark as read                         |
| GET    | `/api/categories`          | List categories                      |
| POST   | `/api/categories`          | Create category                      |
| DELETE | `/api/categories/[id]`     | Delete category + sources + articles |
| GET    | `/api/sources`             | List sources                         |
| POST   | `/api/sources`             | Create source                        |
| PATCH  | `/api/sources/[id]`        | Update source (enable/disable, etc.) |
| DELETE | `/api/sources/[id]`        | Delete source                        |

## Frontend

### Pages

**Dashboard (`/`)**
- Category tabs for filtering (All, AWS, Claude Code, etc.)
- Articles sorted by importance (default), then by publishedAt
- Each article card shows: importance stars, title/summary, source name, time, link to original
- Unread articles in bold, click to mark as read

**Settings (`/settings`)**
- Category CRUD (add, edit, delete)
- Source CRUD per category (add X account, RSS URL; toggle enabled)

### UI Stack

- Tailwind CSS for styling
- No component library — keep it lightweight

## Directory Structure

```
MorningBrief/
├── src/
│   ├── app/
│   │   ├── page.tsx                # Dashboard
│   │   ├── settings/
│   │   │   └── page.tsx            # Settings
│   │   ├── api/
│   │   │   ├── collect/route.ts
│   │   │   ├── articles/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/read/route.ts
│   │   │   ├── categories/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   └── sources/
│   │   │       ├── route.ts
│   │   │       └── [id]/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ArticleCard.tsx
│   │   ├── CategoryTabs.tsx
│   │   ├── CategoryForm.tsx
│   │   └── SourceForm.tsx
│   ├── lib/
│   │   ├── db.ts                   # Prisma client
│   │   ├── collectors/
│   │   │   ├── twitter.ts          # X API fetcher
│   │   │   └── rss.ts              # RSS fetcher
│   │   └── summarizer.ts           # Claude API summarization
│   └── types/
│       └── index.ts
├── prisma/
│   └── schema.prisma
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

## Key Libraries

| Library              | Purpose             |
|----------------------|---------------------|
| `next`               | Framework           |
| `prisma` + `@prisma/client` | ORM + SQLite |
| `@anthropic-ai/sdk`  | Claude API          |
| `twitter-api-v2`     | X API               |
| `rss-parser`         | RSS feed parsing    |
| `tailwindcss`        | Styling             |

## Cron Setup

```bash
# crontab -e
0 7 * * * curl -X POST http://localhost:3000/api/collect
```

## Environment Variables

```
TWITTER_BEARER_TOKEN=<X API bearer token>
ANTHROPIC_API_KEY=<Claude API key>
DATABASE_URL="file:./dev.db"
```
