"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import CategoryForm from "@/components/CategoryForm";
import SourceForm from "@/components/SourceForm";
import { CategoryResponse, SourceResponse } from "@/types";

export default function SettingsPage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [sources, setSources] = useState<SourceResponse[]>([]);

  const fetchData = useCallback(async () => {
    const [catRes, srcRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/sources"),
    ]);
    setCategories(await catRes.json());
    setSources(await srcRes.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-blue-500 text-sm">← ダッシュボード</Link>
          <h1 className="text-xl font-bold text-gray-900">設定</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto mt-6 space-y-6">
        <section className="bg-white rounded-lg shadow-sm p-6">
          <CategoryForm categories={categories} onUpdate={fetchData} />
        </section>
        <section className="bg-white rounded-lg shadow-sm p-6">
          <SourceForm categories={categories} sources={sources} onUpdate={fetchData} />
        </section>
      </main>
    </div>
  );
}
