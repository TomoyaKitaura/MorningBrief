import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const result = db.select().from(categories).orderBy(asc(categories.name)).all();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, slug } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  const existing = db.select().from(categories).where(eq(categories.slug, slug)).get();
  if (existing) {
    return NextResponse.json({ error: "slug already exists" }, { status: 400 });
  }

  const [category] = db.insert(categories).values({ name, slug }).returning().all();
  return NextResponse.json(category, { status: 201 });
}
