import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, url, enabled } = body;

  const data: { name?: string; url?: string; enabled?: boolean; updatedAt?: string } = {};
  if (name !== undefined) data.name = name;
  if (url !== undefined) data.url = url;
  if (enabled !== undefined) data.enabled = enabled;
  data.updatedAt = new Date().toISOString();

  const result = db.update(sources).set(data).where(eq(sources.id, id)).returning().all();
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
  const result = db.delete(sources).where(eq(sources.id, id)).returning().all();
  if (result.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
