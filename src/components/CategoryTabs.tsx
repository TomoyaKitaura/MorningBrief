"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CategoryResponse } from "@/types";

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

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 px-4 overflow-x-auto">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
          selectedId === null ? "border-blue-500 text-blue-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        全て
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
            selectedId === cat.id ? "border-blue-500 text-blue-600 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {cat.name}
        </button>
      ))}
      <Link href="/settings" className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 whitespace-nowrap">
        + 追加
      </Link>
    </div>
  );
}
