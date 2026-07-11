import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  slot: z.string().min(1).max(60),
  text: z.string().min(1).max(600),
  attribution: z.string().max(120).nullable().optional(),
  order: z.number().int().optional(),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const exists = await prisma.quote.findUnique({ where: { slot: d.slot } });
  if (exists) return NextResponse.json({ error: "Slot already exists" }, { status: 400 });
  const q = await prisma.quote.create({
    data: { slot: d.slot, text: d.text, attribution: d.attribution ?? null, order: d.order ?? 99 },
  });
  return NextResponse.json({ ok: true, id: q.id });
}
