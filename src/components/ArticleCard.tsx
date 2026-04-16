"use client";

import { ArticleResponse } from "@/types";

const IMPORTANCE_COLORS: Record<number, string> = {
  5: "var(--color-importance-5)",
  4: "var(--color-importance-4)",
  3: "var(--color-importance-3)",
  2: "var(--color-importance-2)",
  1: "var(--color-importance-1)",
};

function ImportanceBadge({ level }: { level: number }) {
  const color = IMPORTANCE_COLORS[level] ?? IMPORTANCE_COLORS[1];
  return (
    <span
      aria-label={`重要度 ${level}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "1.375rem",
        height: "1.375rem",
        fontSize: "var(--text-xs)",
        fontWeight: 700,
        color: "var(--color-text-inverse)",
        background: color,
        borderRadius: "var(--radius-sm)",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {level}
    </span>
  );
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${Math.max(1, minutes)}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

interface ArticleCardProps {
  article: ArticleResponse;
  onMarkRead: (id: string) => void;
  categoryColor?: string;
}

export default function ArticleCard({
  article,
  onMarkRead,
  categoryColor,
}: ArticleCardProps) {
  const isUnread = !article.readAt;
  const isHighImportance = article.importance >= 4;

  const handleClick = () => {
    if (isUnread) onMarkRead(article.id);
    window.open(article.url, "_blank");
  };

  return (
    <article
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
      style={{
        padding: isHighImportance
          ? "var(--space-lg) var(--space-xl)"
          : "var(--space-md) var(--space-xl)",
        borderBottom: "1px solid var(--color-border-subtle)",
        cursor: "pointer",
        opacity: isUnread ? 1 : 0.6,
        transition: `background var(--duration-fast) var(--ease-out), opacity var(--duration-fast) var(--ease-out)`,
        position: "relative",
        background: isUnread ? "transparent" : "var(--color-surface-sunken)",
      }}
      className="hover:!opacity-100"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = isUnread ? "transparent" : "var(--color-surface-sunken)";
      }}
    >
      {/* Importance accent bar for high-importance articles */}
      {isHighImportance && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "3px",
            background: IMPORTANCE_COLORS[article.importance],
            borderRadius: "0 2px 2px 0",
          }}
          aria-hidden="true"
        />
      )}

      <div className="flex items-start gap-3">
        <ImportanceBadge level={article.importance} />

        <div className="flex-1 min-w-0">
          <h3
            style={{
              fontSize: isHighImportance ? "var(--text-base)" : "var(--text-sm)",
              fontWeight: isUnread ? 600 : 400,
              color: isUnread ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              lineHeight: 1.4,
              marginBottom: "var(--space-xs)",
            }}
          >
            {article.title || article.summary || "(no title)"}
          </h3>

          {article.summary && isHighImportance && (
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-text-secondary)",
                lineHeight: 1.5,
                marginBottom: "var(--space-sm)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {article.summary}
            </p>
          )}

          <div
            className="flex items-center gap-2 flex-wrap"
            style={{ fontSize: "var(--text-xs)", color: "var(--color-text-tertiary)" }}
          >
            {categoryColor && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "var(--radius-full)",
                    background: categoryColor,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                {article.category.name}
              </span>
            )}
            {!categoryColor && (
              <span>{article.category.name}</span>
            )}
            <span style={{ color: "var(--color-border)" }}>&middot;</span>
            <span>{article.source.name}</span>
            <span style={{ color: "var(--color-border)" }}>&middot;</span>
            <span>{timeAgo(article.publishedAt)}</span>
          </div>
        </div>

        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: "var(--color-text-tertiary)",
            flexShrink: 0,
            marginTop: "2px",
          }}
        >
          <path d="M6 12l4-4-4-4" />
        </svg>
      </div>
    </article>
  );
}
