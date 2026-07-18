import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const Schema = z.object({
  author: z.string().min(1).max(120).optional(),
  location: z.string().max(120).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  text: z.string().min(1).max(4000).optional(),
  photos: z.array(z.string().url()).max(12).optional(),
  featured: z.boolean().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;

  await prisma.review.update({
    where: { id },
    data: {
      ...(d.author !== undefined ? { author: d.author } : {}),
      ...(d.location !== undefined ? { location: d.location || null } : {}),
      ...(d.rating !== undefined ? { rating: d.rating } : {}),
      ...(d.text !== undefined ? { text: d.text } : {}),
      ...(d.photos !== undefined ? { photos: JSON.stringify(d.photos) } : {}),
      ...(d.featured !== undefined ? { featured: d.featured } : {}),
      ...(d.order !== undefined ? { order: d.order } : {}),
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.review.delete({ where: { id } }).catch(() => null);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
