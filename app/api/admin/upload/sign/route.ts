import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { r2Configured, presignUpload, r2PublicUrl, buildUploadKey } from "@/lib/storage";

export const runtime = "nodejs";

const MAX = 1024 * 1024 * 1024; // 1 GB — generous ceiling for hero videos

const Schema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(120),
  size: z.number().int().positive(),
});

/**
 * Returns a presigned URL the browser can PUT a file to directly (straight to
 * R2, skipping the ~4.5 MB Vercel function-body cap). If R2 isn't configured
 * (local dev), responds { fallback: true } so the client uses the multipart
 * route instead.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { filename, contentType, size } = parsed.data;

  const isImage = contentType.startsWith("image/");
  const isVideo = contentType.startsWith("video/");
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Only images or videos are allowed" }, { status: 400 });
  }
  if (size > MAX) {
    return NextResponse.json({ error: "File too large (max 1 GB)" }, { status: 400 });
  }

  if (!r2Configured) {
    // No object storage here — client should POST the file to /api/admin/upload.
    return NextResponse.json({ fallback: true });
  }

  const key = buildUploadKey(filename, isImage ? ".jpg" : ".mp4");
  const uploadUrl = await presignUpload(key, contentType);

  return NextResponse.json({
    uploadUrl,
    publicUrl: r2PublicUrl(key),
    key,
    contentType,
    type: isImage ? "image" : "video",
  });
}
