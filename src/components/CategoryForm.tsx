"use client";

import { useState } from "react";
import { CategoryResponse } from "@/types";

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
      <h2 className="text-lg font-bold mb-3">カテゴリ</h2>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="カテゴリ名" className="border rounded px-3 py-1.5 text-sm flex-1" />
        <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" className="border rounded px-3 py-1.5 text-sm w-32" />
        <button type="submit" className="bg-blue-500 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-600">追加</button>
      </form>
      <ul className="space-y-2">
        {categories.map((cat) => (
          <li key={cat.id} className="flex items-center justify-between border rounded p-2">
            {editingId === cat.id ? (
              <div className="flex gap-2 flex-1">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="border rounded px-2 py-1 text-sm flex-1" />
                <button onClick={() => handleEdit(cat.id)} className="text-blue-500 text-sm">保存</button>
                <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm">キャンセル</button>
              </div>
            ) : (
              <>
                <span className="text-sm">{cat.name} <span className="text-gray-400">({cat.slug})</span></span>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(cat.id); setEditName(cat.name); }} className="text-blue-500 text-sm">編集</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-red-500 text-sm">削除</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
