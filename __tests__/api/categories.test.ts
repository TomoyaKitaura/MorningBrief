import { GET, POST } from "@/app/api/categories/route";
import { PATCH, DELETE } from "@/app/api/categories/[id]/route";
import { db } from "@/lib/db";
import { categories, sources, articles } from "@/lib/schema";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";

beforeEach(() => {
  db.delete(articles).run();
  db.delete(sources).run();
  db.delete(categories).run();
});

describe("GET /api/categories", () => {
  it("returns empty array when no categories exist", async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("returns all categories sorted by name", async () => {
    db.insert(categories).values({ name: "Claude Code", slug: "claude-code" }).run();
    db.insert(categories).values({ name: "AWS", slug: "aws" }).run();
    const res = await GET();
    const data = await res.json();
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("AWS");
  });
});

describe("POST /api/categories", () => {
  it("creates a new category", async () => {
    const req = new NextRequest("http://localhost/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "AWS", slug: "aws" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.name).toBe("AWS");
    expect(data.slug).toBe("aws");
  });

  it("returns 400 for duplicate slug", async () => {
    db.insert(categories).values({ name: "AWS", slug: "aws" }).run();
    const req = new NextRequest("http://localhost/api/categories", {
      method: "POST",
      body: JSON.stringify({ name: "AWS 2", slug: "aws" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/categories/[id]", () => {
  it("updates category name", async () => {
    const [category] = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning().all();
    const req = new NextRequest(`http://localhost/api/categories/${category.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: "Amazon Web Services" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: category.id }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.name).toBe("Amazon Web Services");
  });
});

describe("DELETE /api/categories/[id]", () => {
  it("deletes a category and cascades", async () => {
    const [category] = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning().all();
    const req = new NextRequest(`http://localhost/api/categories/${category.id}`, { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: category.id }) });
    expect(res.status).toBe(204);
    const [{ count }] = db.select({ count: sql<number>`count(*)` }).from(categories).all();
    expect(count).toBe(0);
  });
});
