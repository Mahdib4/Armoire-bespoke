import { NextResponse } from "next/server";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { putObject } from "@/lib/storage";

export const runtime = "nodejs";

const MAX = 200 * 1024 * 1024; // 200MB (videos)

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "File too large" }, { status: 400 });

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Only images or videos allowed" }, { status: 400 });
  }

  const ext = (path.extname(file.name) || (isImage ? ".jpg" : ".mp4")).toLowerCase();
  const base =
    path
      .basename(file.name, path.extname(file.name))
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "upload";
  const key = `uploads/${Date.now()}-${base}${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const url = await putObject(key, buf, file.type);

  const media = await prisma.media.create({
    data: { url, type: isImage ? "image" : "video", alt: base },
  });

  return NextResponse.json({ ok: true, url, id: media.id, type: media.type });
}
