import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, slug } = body;

  const data: { name?: string; slug?: string; updatedAt?: string } = {};
  if (name !== undefined) data.name = name;
  if (slug !== undefined) data.slug = slug;
  data.updatedAt = new Date().toISOString();

  const result = db.update(categories).set(data).where(eq(categories.id, id)).returning().all();
  if (result.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = db.delete(categories).where(eq(categories.id, id)).returning().all();
  if (result.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
