"use client";
import { useRef, useState } from "react";

// Vercel caps a Serverless Function request body at ~4.5 MB. Uploads go through
// /api/admin/upload (a function) before reaching R2, so anything bigger is
// rejected by the platform with a plain-text 413 before our code even runs.
// We keep well under that: shrink large images in the browser first, and guard
// anything still too big with a readable message.
const SERVER_LIMIT = 4.3 * 1024 * 1024; // stay safely under Vercel's ~4.5 MB body cap
const IMAGE_TARGET = 3_600_000; // aim compressed images below this many bytes
const MAX_DIM = 2400; // px — longest edge is plenty for web-scale imagery

/** Downscale + re-encode an oversized image in the browser. Non-images and
 *  files we can't decode are returned untouched. */
async function shrinkImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= IMAGE_TARGET) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // formats the browser can't decode (e.g. HEIC) — caller size-checks instead
  }

  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // Flatten any transparency onto white so JPEG encoding doesn't blacken it.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const encode = (q: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", q));

  let quality = 0.85;
  let blob = await encode(quality);
  while (blob && blob.size > IMAGE_TARGET && quality > 0.4) {
    quality -= 0.1;
    blob = await encode(quality);
  }
  if (!blob) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

export default function Uploader({
  accept = "image/*",
  label = "Upload",
  endpoint = "/api/admin/upload",
  onUploaded,
}: {
  accept?: string;
  label?: string;
  endpoint?: string;
  onUploaded: (url: string, type: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    if (!original) return;
    setBusy(true);
    try {
      const file = await shrinkImage(original);

      // Local dev writes to disk and has no body cap; only guard on the platform.
      const isLocal =
        typeof window !== "undefined" &&
        ["localhost", "127.0.0.1"].includes(window.location.hostname);
      if (!isLocal && file.size > SERVER_LIMIT) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        throw new Error(
          file.type.startsWith("video/")
            ? `This video is ${mb} MB. Video uploads are limited to about 4 MB here — please compress it first, or ask your developer to enable large-file uploads.`
            : `This file is ${mb} MB, over the ~4 MB upload limit. Please use a smaller file.`
        );
      }

      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd });

      // The platform may return a non-JSON body (e.g. a 413 error page), so read
      // text first and only then try to parse it.
      const text = await res.text();
      let data: { url?: string; type?: string; error?: string } | null = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        /* non-JSON response */
      }

      if (!res.ok || !data?.url) {
        const msg =
          data?.error ||
          (res.status === 413
            ? "File too large for the server (max ~4 MB). Please use a smaller image."
            : `Upload failed (${res.status}). Please try again.`);
        throw new Error(msg);
      }

      onUploaded(data.url, data.type || "image");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <button type="button" className="adm-btn sm" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? "Uploading…" : label}
      </button>
      <input ref={ref} type="file" accept={accept} hidden onChange={handle} />
    </>
  );
}
