"use client";

import { useState } from "react";
import { CategoryResponse, SourceResponse } from "@/types";

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
      <h2 className="text-lg font-bold mb-3">ソース（RSSフィード）</h2>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4 flex-wrap">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
          <option value="">カテゴリ選択</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ソース名" className="border rounded px-3 py-1.5 text-sm" />
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="RSSフィードURL" className="border rounded px-3 py-1.5 text-sm flex-1" />
        <button type="submit" className="bg-blue-500 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-600">追加</button>
      </form>
      {categories.map((cat) => {
        const catSources = sourcesByCategory.get(cat.id) || [];
        if (catSources.length === 0) return null;
        return (
          <div key={cat.id} className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{cat.name}</h3>
            <ul className="space-y-1">
              {catSources.map((source) => (
                <li key={source.id} className="flex items-center justify-between border rounded p-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(source)} className={`w-8 h-5 rounded-full transition-colors ${source.enabled ? "bg-green-500" : "bg-gray-300"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${source.enabled ? "translate-x-3.5" : "translate-x-0.5"}`} />
                    </button>
                    <span className="text-sm">{source.name}</span>
                    <span className="text-xs text-gray-400 truncate max-w-xs">{source.url}</span>
                  </div>
                  <button onClick={() => handleDelete(source.id)} className="text-red-500 text-sm">削除</button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
