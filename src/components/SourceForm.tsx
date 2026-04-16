"use client";

import { useState } from "react";
import { CategoryResponse, SourceResponse } from "@/types";

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-md)",
  padding: "var(--space-sm) var(--space-md)",
  fontSize: "var(--text-sm)",
  color: "var(--color-text-primary)",
  background: "var(--color-surface-primary)",
  outline: "none",
  transition: `border-color var(--duration-fast) var(--ease-out)`,
};

const btnPrimary: React.CSSProperties = {
  background: "var(--color-text-primary)",
  color: "var(--color-text-inverse)",
  padding: "var(--space-sm) var(--space-lg)",
  borderRadius: "var(--radius-md)",
  fontSize: "var(--text-sm)",
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
  transition: `opacity var(--duration-fast) var(--ease-out)`,
};

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
      <h2
        style={{
          fontSize: "var(--text-base)",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          marginBottom: "var(--space-lg)",
        }}
      >
        ソース（RSSフィード）
      </h2>
      <form
        onSubmit={handleAdd}
        className="flex gap-2 flex-wrap"
        style={{ marginBottom: "var(--space-xl)" }}
      >
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={inputStyle}
        >
          <option value="">カテゴリ選択</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ソース名"
          style={inputStyle}
        />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="RSSフィードURL"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button type="submit" style={btnPrimary} className="hover:opacity-80">
          追加
        </button>
      </form>
      {categories.map((cat) => {
        const catSources = sourcesByCategory.get(cat.id) || [];
        if (catSources.length === 0) return null;
        return (
          <div key={cat.id} style={{ marginBottom: "var(--space-xl)" }}>
            <h3
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "var(--color-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "var(--space-sm)",
              }}
            >
              {cat.name}
            </h3>
            <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
              {catSources.map((source) => (
                <li
                  key={source.id}
                  className="flex items-center justify-between"
                  style={{
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-sm) var(--space-md)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggle(source)}
                      style={{
                        width: "2rem",
                        height: "1.25rem",
                        borderRadius: "var(--radius-full)",
                        background: source.enabled ? "var(--color-importance-2)" : "var(--color-border)",
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        transition: `background var(--duration-fast) var(--ease-out)`,
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: "2px",
                          left: source.enabled ? "calc(100% - 1rem - 2px)" : "2px",
                          width: "1rem",
                          height: "1rem",
                          borderRadius: "var(--radius-full)",
                          background: "white",
                          boxShadow: "var(--shadow-sm)",
                          transition: `left var(--duration-fast) var(--ease-out)`,
                        }}
                      />
                    </button>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)" }}>
                      {source.name}
                    </span>
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-text-tertiary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "16rem",
                      }}
                    >
                      {source.url}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(source.id)}
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--color-importance-5)",
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                    }}
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
