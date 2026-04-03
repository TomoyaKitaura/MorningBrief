"use client";

import { useState, useEffect } from "react";
import CategoryTabs from "@/components/CategoryTabs";
import ArticleList from "@/components/ArticleList";

export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [lastCollected, setLastCollected] = useState<string | null>(null);

  useEffect(() => {
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
