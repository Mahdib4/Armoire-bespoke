"use client";
import { useRef, useState } from "react";

// Admin uploads (direct = true) go straight from the browser to Cloudflare R2
// via a presigned URL, so there is no size limit — large photos and videos work.
// The public inspiration form (direct = false) keeps posting through the server,
// where Vercel caps the body at ~4.5 MB, so those images are shrunk first.

const IMAGE_TARGET = 3_600_000; // bytes — target size when compressing for the server path
const MAX_DIM = 2400; // px — longest edge when compressing for the server path

type SignResponse = {
  uploadUrl?: string;
  publicUrl?: string;
  key?: string;
  contentType?: string;
  type?: "image" | "video";
  fallback?: boolean;
  error?: string;
};
type UploadResponse = { url?: string; type?: string; error?: string };

async function safeJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null; // non-JSON body (e.g. a platform error page)
  }
}

/** Downscale + re-encode an oversized image (used only for the size-capped server path). */
async function shrinkImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= IMAGE_TARGET) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
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

/** PUT a file straight to storage with upload-progress reporting. */
function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Storage rejected the upload (${xhr.status}).`));
    xhr.onerror = () =>
      reject(
        new Error(
          "Could not reach storage (network or CORS). If this persists, the R2 bucket needs a CORS policy allowing this site."
        )
      );
    xhr.send(file);
  });
}

export default function Uploader({
  accept = "image/*",
  label = "Upload",
  endpoint = "/api/admin/upload",
  direct = true,
  onUploaded,
}: {
  accept?: string;
  label?: string;
  endpoint?: string;
  /** true = presigned direct-to-R2 (admin, no size limit); false = server multipart (public, ≤4.5 MB). */
  direct?: boolean;
  onUploaded: (url: string, type: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);

  // Post a file through the server (size-capped path). Used for the public form
  // and as a local-dev fallback when R2 isn't configured.
  const uploadViaServer = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(endpoint, { method: "POST", body: fd });
    const data = await safeJson<UploadResponse>(res);
    if (!res.ok || !data?.url) {
      const msg =
        data?.error ||
        (res.status === 413
          ? "File too large for the server (max ~4 MB). Please use a smaller file."
          : `Upload failed (${res.status}). Please try again.`);
      throw new Error(msg);
    }
    onUploaded(data.url, data.type || "image");
  };

  // Upload straight to R2 via a presigned URL (no size limit).
  const uploadDirect = async (file: File) => {
    const contentType = file.type || "application/octet-stream";
    const signRes = await fetch("/api/admin/upload/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, contentType, size: file.size }),
    });
    const sign = await safeJson<SignResponse>(signRes);
    if (!signRes.ok) throw new Error(sign?.error || `Could not start upload (${signRes.status}).`);

    // No R2 in this environment → go through the server instead.
    if (sign?.fallback) return uploadViaServer(file);
    if (!sign?.uploadUrl || !sign?.publicUrl) throw new Error("Upload could not be prepared.");

    const kind = sign.type || (contentType.startsWith("video/") ? "video" : "image");
    await putWithProgress(sign.uploadUrl, file, sign.contentType || contentType, setPct);

    // Record it in the media library (non-fatal if it fails).
    fetch("/api/admin/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: sign.publicUrl, type: kind, alt: file.name.slice(0, 120) }),
    }).catch(() => {});

    onUploaded(sign.publicUrl, kind);
  };

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    if (!original) return;
    setBusy(true);
    setPct(0);
    try {
      if (direct) {
        await uploadDirect(original);
      } else {
        // Public server path: keep images under the 4.5 MB body cap.
        await uploadViaServer(await shrinkImage(original));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      setPct(0);
      if (ref.current) ref.current.value = "";
    }
  };

  const busyLabel = pct > 0 && pct < 100 ? `Uploading… ${pct}%` : "Uploading…";

  return (
    <>
      <button
        type="button"
        className="adm-btn sm"
        onClick={() => ref.current?.click()}
        disabled={busy}
      >
        {busy ? busyLabel : label}
      </button>
      <input ref={ref} type="file" accept={accept} hidden onChange={handle} />
    </>
  );
}
