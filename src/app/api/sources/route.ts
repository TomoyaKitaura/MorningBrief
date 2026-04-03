import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("categoryId");
  const query = db.select().from(sources);
  const result = categoryId
    ? query.where(eq(sources.categoryId, categoryId)).orderBy(asc(sources.name)).all()
    : query.orderBy(asc(sources.name)).all();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { categoryId, name, url } = body;

  if (!categoryId || !name || !url) {
    return NextResponse.json({ error: "categoryId, name, and url are required" }, { status: 400 });
  }

  const [source] = db.insert(sources).values({ categoryId, name, url }).returning().all();
  return NextResponse.json(source, { status: 201 });
}
