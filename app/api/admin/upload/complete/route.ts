import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const Schema = z.object({
  url: z.string().url(),
  type: z.enum(["image", "video"]),
  alt: z.string().max(120).optional(),
});

/** Record a directly-uploaded object in the Media library (best-effort). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { url, type, alt } = parsed.data;

  const media = await prisma.media.create({ data: { url, type, alt: alt || "" } });
  return NextResponse.json({ ok: true, id: media.id });
}
