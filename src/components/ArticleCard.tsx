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
