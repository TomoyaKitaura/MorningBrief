import { GET, POST } from "@/app/api/sources/route";
import { PATCH, DELETE } from "@/app/api/sources/[id]/route";
import { db } from "@/lib/db";
import { categories, sources, articles } from "@/lib/schema";
import { NextRequest } from "next/server";

let categoryId: string;

beforeEach(() => {
  db.delete(articles).run();
  db.delete(sources).run();
  db.delete(categories).run();
  const result = db.insert(categories).values({ name: "AWS", slug: "aws" }).returning().all();
  categoryId = result[0].id;
});

describe("GET /api/sources", () => {
  it("returns sources filtered by categoryId", async () => {
    db.insert(sources).values({ categoryId, name: "AWS Blog", url: "https://aws.amazon.com/blogs/aws/feed/" }).run();
    const req = new NextRequest(`http://localhost/api/sources?categoryId=${categoryId}`);
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("AWS Blog");
  });
});

describe("POST /api/sources", () => {
  it("creates a new source", async () => {
    const req = new NextRequest("http://localhost/api/sources", {
      method: "POST",
      body: JSON.stringify({ categoryId, name: "AWS Blog", url: "https://aws.amazon.com/blogs/aws/feed/" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.name).toBe("AWS Blog");
    expect(data.enabled).toBe(true);
  });
});

describe("PATCH /api/sources/[id]", () => {
  it("toggles enabled flag", async () => {
    const result = db.insert(sources).values({ categoryId, name: "AWS Blog", url: "https://aws.amazon.com/blogs/aws/feed/" }).returning().all();
    const source = result[0];
    const req = new NextRequest(`http://localhost/api/sources/${source.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: false }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: source.id }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.enabled).toBe(false);
  });
});

describe("DELETE /api/sources/[id]", () => {
  it("deletes a source", async () => {
    const result = db.insert(sources).values({ categoryId, name: "AWS Blog", url: "https://aws.amazon.com/blogs/aws/feed/" }).returning().all();
    const source = result[0];
    const req = new NextRequest(`http://localhost/api/sources/${source.id}`, { method: "DELETE" });
    const res = await DELETE(req, { params: Promise.resolve({ id: source.id }) });
    expect(res.status).toBe(204);
  });
});
