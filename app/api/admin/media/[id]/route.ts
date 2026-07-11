import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Only removes the library record; the file remains on disk (may still be referenced).
  await prisma.media.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
