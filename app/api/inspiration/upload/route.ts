import { NextResponse } from "next/server";
import path from "node:path";
import { putObject } from "@/lib/storage";

export const runtime = "nodejs";

// Public endpoint for customers to attach inspiration photos. Images only, capped.
const MAX = 12 * 1024 * 1024; // 12MB

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Image too large (max 12MB)" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  }

  const ext = (path.extname(file.name) || ".jpg").toLowerCase();
  const base =
    path
      .basename(file.name, path.extname(file.name))
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "inspiration";
  const key = `uploads/inspiration/${Date.now()}-${base}${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const url = await putObject(key, buf, file.type);

  return NextResponse.json({ ok: true, url, type: "image" });
}
