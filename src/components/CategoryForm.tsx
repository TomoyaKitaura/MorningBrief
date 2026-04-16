"use client";

import { useState } from "react";
import { CategoryResponse } from "@/types";

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
      <h2
        style={{
          fontSize: "var(--text-base)",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          marginBottom: "var(--space-lg)",
        }}
      >
        カテゴリ
      </h2>
      <form onSubmit={handleAdd} className="flex gap-2" style={{ marginBottom: "var(--space-xl)" }}>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="カテゴリ名"
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug"
          style={{ ...inputStyle, width: "8rem" }}
        />
        <button type="submit" style={btnPrimary} className="hover:opacity-80">
          追加
        </button>
      </form>
      <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        {categories.map((cat) => (
          <li
            key={cat.id}
            className="flex items-center justify-between"
            style={{
              border: "1px solid var(--color-border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-sm) var(--space-md)",
            }}
          >
            {editingId === cat.id ? (
              <div className="flex gap-2 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => handleEdit(cat.id)}
                  style={{ fontSize: "var(--text-sm)", color: "var(--color-accent)", cursor: "pointer", background: "none", border: "none" }}
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  style={{ fontSize: "var(--text-sm)", color: "var(--color-text-tertiary)", cursor: "pointer", background: "none", border: "none" }}
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-primary)" }}>
                  {cat.name}{" "}
                  <span style={{ color: "var(--color-text-tertiary)" }}>({cat.slug})</span>
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                    style={{ fontSize: "var(--text-sm)", color: "var(--color-accent)", cursor: "pointer", background: "none", border: "none" }}
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    style={{ fontSize: "var(--text-sm)", color: "var(--color-importance-5)", cursor: "pointer", background: "none", border: "none" }}
                  >
                    削除
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
