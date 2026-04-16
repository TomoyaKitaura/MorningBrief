"use client";

import { useEffect, useState } from "react";
import { CategoryResponse } from "@/types";

const CAT_COLORS = [
  "var(--color-cat-1)",
  "var(--color-cat-2)",
  "var(--color-cat-3)",
  "var(--color-cat-4)",
  "var(--color-cat-5)",
  "var(--color-cat-6)",
];

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

  const isAllSelected = selectedId === null;

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto"
    >
      <button
        onClick={() => onSelect(null)}
        style={{
          padding: "var(--space-xs) var(--space-md)",
          fontSize: "var(--text-sm)",
          fontWeight: isAllSelected ? 600 : 400,
          color: isAllSelected ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
          background: isAllSelected ? "var(--color-text-primary)" : "transparent",
          border: isAllSelected ? "none" : "1px solid var(--color-border)",
          borderRadius: "var(--radius-full)",
          whiteSpace: "nowrap",
          cursor: "pointer",
          transition: `all var(--duration-fast) var(--ease-out)`,
          lineHeight: "1.6",
        }}
      >
        全て
      </button>
      {categories.map((cat, i) => {
        const isActive = selectedId === cat.id;
        const catColor = CAT_COLORS[i % CAT_COLORS.length];
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            style={{
              padding: "var(--space-xs) var(--space-md)",
              fontSize: "var(--text-sm)",
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--color-text-inverse)" : "var(--color-text-secondary)",
              background: isActive ? catColor : "transparent",
              border: isActive ? "none" : "1px solid var(--color-border)",
              borderRadius: "var(--radius-full)",
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: `all var(--duration-fast) var(--ease-out)`,
              lineHeight: "1.6",
            }}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
