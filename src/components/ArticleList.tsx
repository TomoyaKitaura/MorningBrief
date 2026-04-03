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
