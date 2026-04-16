"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CategoryTabs from "@/components/CategoryTabs";
import ArticleList from "@/components/ArticleList";

export type SortBy = "importance" | "publishedAt";

export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("importance");
  const [lastCollected, setLastCollected] = useState<string | null>(null);
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("ja-JP", {
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    );
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
    <div className="min-h-screen" style={{ background: "var(--color-surface-base)" }}>
      <header
        style={{
          background: "var(--color-surface-primary)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-end justify-between">
          <div>
            <h1
              className="tracking-tight"
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: 800,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              毎日キャッチアップするマン
            </h1>
            <p
              className="mt-1"
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-text-tertiary)",
              }}
            >
              {today}
              {lastCollected && <span> &middot; {lastCollected} 更新</span>}
            </p>
          </div>
          <Link
            href="/settings"
            style={{
              color: "var(--color-text-tertiary)",
              transition: `color var(--duration-fast) var(--ease-out)`,
            }}
            className="hover:opacity-70"
            aria-label="設定"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
              <path d="M16.2 12.5a1.4 1.4 0 0 0 .28 1.54l.05.05a1.7 1.7 0 1 1-2.4 2.4l-.06-.05a1.4 1.4 0 0 0-1.54-.28 1.4 1.4 0 0 0-.85 1.28v.14a1.7 1.7 0 1 1-3.4 0v-.07a1.4 1.4 0 0 0-.91-1.28 1.4 1.4 0 0 0-1.54.28l-.05.05a1.7 1.7 0 1 1-2.4-2.4l.05-.06a1.4 1.4 0 0 0 .28-1.54 1.4 1.4 0 0 0-1.28-.85h-.14a1.7 1.7 0 0 1 0-3.4h.07a1.4 1.4 0 0 0 1.28-.91 1.4 1.4 0 0 0-.28-1.54l-.05-.05a1.7 1.7 0 1 1 2.4-2.4l.06.05a1.4 1.4 0 0 0 1.54.28h.07a1.4 1.4 0 0 0 .85-1.28v-.14a1.7 1.7 0 1 1 3.4 0v.07a1.4 1.4 0 0 0 .85 1.28 1.4 1.4 0 0 0 1.54-.28l.05-.05a1.7 1.7 0 1 1 2.4 2.4l-.05.06a1.4 1.4 0 0 0-.28 1.54v.07a1.4 1.4 0 0 0 1.28.85h.14a1.7 1.7 0 0 1 0 3.4h-.07a1.4 1.4 0 0 0-1.28.85Z" />
            </svg>
          </Link>
        </div>
      </header>
      <main
        className="max-w-3xl mx-auto mt-4"
        style={{
          background: "var(--color-surface-primary)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          overflow: "hidden",
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: "var(--space-lg) var(--space-xl)",
            borderBottom: "1px solid var(--color-border-subtle)",
          }}
        >
          <CategoryTabs selectedId={selectedCategory} onSelect={setSelectedCategory} />
          <div
            className="flex items-center gap-1 shrink-0"
            style={{
              background: "var(--color-surface-sunken)",
              borderRadius: "var(--radius-full)",
              padding: "2px",
            }}
          >
            <button
              onClick={() => setSortBy("importance")}
              style={{
                padding: "var(--space-xs) var(--space-md)",
                fontSize: "var(--text-xs)",
                fontWeight: sortBy === "importance" ? 600 : 400,
                color: sortBy === "importance" ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                background: sortBy === "importance" ? "var(--color-surface-primary)" : "transparent",
                border: "none",
                borderRadius: "var(--radius-full)",
                cursor: "pointer",
                transition: `all var(--duration-fast) var(--ease-out)`,
                boxShadow: sortBy === "importance" ? "var(--shadow-sm)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              重要度
            </button>
            <button
              onClick={() => setSortBy("publishedAt")}
              style={{
                padding: "var(--space-xs) var(--space-md)",
                fontSize: "var(--text-xs)",
                fontWeight: sortBy === "publishedAt" ? 600 : 400,
                color: sortBy === "publishedAt" ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                background: sortBy === "publishedAt" ? "var(--color-surface-primary)" : "transparent",
                border: "none",
                borderRadius: "var(--radius-full)",
                cursor: "pointer",
                transition: `all var(--duration-fast) var(--ease-out)`,
                boxShadow: sortBy === "publishedAt" ? "var(--shadow-sm)" : "none",
                whiteSpace: "nowrap",
              }}
            >
              新着順
            </button>
          </div>
        </div>
        <ArticleList categoryId={selectedCategory} sortBy={sortBy} />
      </main>
    </div>
  );
}
