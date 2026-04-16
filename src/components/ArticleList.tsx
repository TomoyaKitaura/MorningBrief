"use client";

import { useEffect, useState, useCallback } from "react";
import ArticleCard from "./ArticleCard";
import { ArticleResponse } from "@/types";

const PAGE_SIZE = 50;

const CAT_COLORS = [
  "var(--color-cat-1)",
  "var(--color-cat-2)",
  "var(--color-cat-3)",
  "var(--color-cat-4)",
  "var(--color-cat-5)",
  "var(--color-cat-6)",
];

function SkeletonRow({ wide }: { wide?: boolean }) {
  return (
    <div
      style={{
        padding: wide ? "var(--space-lg) var(--space-xl)" : "var(--space-md) var(--space-xl)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          style={{
            width: "1.375rem",
            height: "1.375rem",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface-sunken)",
            flexShrink: 0,
          }}
        />
        <div className="flex-1 space-y-2">
          <div
            style={{
              height: "0.875rem",
              width: wide ? "75%" : "60%",
              background: "var(--color-surface-sunken)",
              borderRadius: "var(--radius-sm)",
            }}
          />
          {wide && (
            <div
              style={{
                height: "0.75rem",
                width: "90%",
                background: "var(--color-surface-sunken)",
                borderRadius: "var(--radius-sm)",
              }}
            />
          )}
          <div
            style={{
              height: "0.625rem",
              width: "40%",
              background: "var(--color-surface-sunken)",
              borderRadius: "var(--radius-sm)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
      <SkeletonRow wide />
      <SkeletonRow wide />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ padding: "var(--space-3xl) var(--space-xl)" }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "var(--color-border)", marginBottom: "var(--space-lg)" }}
      >
        <rect x="8" y="6" width="32" height="36" rx="3" />
        <path d="M16 14h16M16 22h16M16 30h8" />
      </svg>
      <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-tertiary)" }}>
        記事がありません
      </p>
    </div>
  );
}

export default function ArticleList({ categoryId, sortBy = "importance" }: { categoryId: string | null; sortBy?: string }) {
  const [articles, setArticles] = useState<ArticleResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryColorMap, setCategoryColorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((cats: Array<{ id: string }>) => {
        const map: Record<string, string> = {};
        cats.forEach((c, i) => { map[c.id] = CAT_COLORS[i % CAT_COLORS.length]; });
        setCategoryColorMap(map);
      });
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    params.set("sortBy", sortBy);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));

    const res = await fetch(`/api/articles?${params}`);
    const data = await res.json();
    setArticles(data.articles);
    setTotal(data.total);
    setLoading(false);
  }, [categoryId, sortBy, offset]);

  useEffect(() => { setOffset(0); }, [categoryId, sortBy]);
  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/articles/${id}/read`, { method: "PATCH" });
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, readAt: new Date().toISOString() } : a))
    );
  };

  if (loading) return <LoadingSkeleton />;
  if (articles.length === 0) return <EmptyState />;

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          onMarkRead={handleMarkRead}
          categoryColor={categoryColorMap[article.category.id]}
        />
      ))}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-center gap-3"
          style={{ padding: "var(--space-lg) var(--space-xl)" }}
        >
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            style={{
              padding: "var(--space-xs) var(--space-md)",
              fontSize: "var(--text-sm)",
              color: offset === 0 ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
              background: "transparent",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-full)",
              cursor: offset === 0 ? "default" : "pointer",
              opacity: offset === 0 ? 0.4 : 1,
              transition: `all var(--duration-fast) var(--ease-out)`,
            }}
          >
            &larr; 前へ
          </button>
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-tertiary)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={currentPage >= totalPages}
            style={{
              padding: "var(--space-xs) var(--space-md)",
              fontSize: "var(--text-sm)",
              color: currentPage >= totalPages ? "var(--color-text-tertiary)" : "var(--color-text-secondary)",
              background: "transparent",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-full)",
              cursor: currentPage >= totalPages ? "default" : "pointer",
              opacity: currentPage >= totalPages ? 0.4 : 1,
              transition: `all var(--duration-fast) var(--ease-out)`,
            }}
          >
            次へ &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
