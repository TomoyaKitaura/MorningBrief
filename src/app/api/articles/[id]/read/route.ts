import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articles } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [article] = db.update(articles).set({ readAt: new Date().toISOString() }).where(eq(articles.id, id)).returning().all();
  return NextResponse.json(article);
}
