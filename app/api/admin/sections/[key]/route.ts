import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Schema = z.object({
  title: z.string().max(160).nullable().optional(),
  subtitle: z.string().max(200).nullable().optional(),
  body: z.string().max(4000).nullable().optional(),
  config: z.string().max(4000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await prisma.section.upsert({
    where: { key },
    update: parsed.data,
    create: { key, ...parsed.data },
  });
  return NextResponse.json({ ok: true });
}
