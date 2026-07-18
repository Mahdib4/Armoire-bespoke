import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const Schema = z.object({
  author: z.string().min(1).max(120),
  location: z.string().max(120).optional().default(""),
  rating: z.number().int().min(1).max(5).optional().default(5),
  text: z.string().min(1).max(4000),
  photos: z.array(z.string().url()).max(12).optional().default([]),
  featured: z.boolean().optional().default(false),
  order: z.number().int().optional().default(0),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;

  const review = await prisma.review.create({
    data: {
      author: d.author,
      location: d.location || null,
      rating: d.rating,
      text: d.text,
      photos: JSON.stringify(d.photos),
      featured: d.featured,
      order: d.order,
    },
  });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, id: review.id });
}
