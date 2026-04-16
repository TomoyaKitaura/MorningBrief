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
    <div className="min-h-screen" style={{ background: "var(--color-surface-base)" }}>
      <header
        style={{
          background: "var(--color-surface-primary)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-4">
          <Link
            href="/"
            className="hover:opacity-70"
            style={{
              color: "var(--color-text-tertiary)",
              fontSize: "var(--text-sm)",
              transition: `color var(--duration-fast) var(--ease-out)`,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 10H5M5 10l5 5M5 10l5-5" />
            </svg>
          </Link>
          <h1
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            設定
          </h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto mt-6 space-y-5 px-6 pb-12">
        <section
          style={{
            background: "var(--color-surface-primary)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: "var(--space-xl)",
          }}
        >
          <CategoryForm categories={categories} onUpdate={fetchData} />
        </section>
        <section
          style={{
            background: "var(--color-surface-primary)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-sm)",
            padding: "var(--space-xl)",
          }}
        >
          <SourceForm categories={categories} sources={sources} onUpdate={fetchData} />
        </section>
      </main>
    </div>
  );
}
