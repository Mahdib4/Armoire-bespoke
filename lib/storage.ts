import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Object storage abstraction.
 * - If Cloudflare R2 env vars are set, uploads go to R2 and a public URL is
 *   returned (R2_PUBLIC_URL/<key>).
 * - Otherwise (local dev with no R2), files are written to public/uploads and a
 *   relative /uploads/<name> URL is returned.
 */

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
} = process.env;

export const r2Configured =
  !!R2_ACCOUNT_ID && !!R2_ACCESS_KEY_ID && !!R2_SECRET_ACCESS_KEY && !!R2_BUCKET && !!R2_PUBLIC_URL;

let _client: S3Client | null = null;
export function r2Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

function publicUrl(key: string): string {
  const base = (R2_PUBLIC_URL || "").replace(/\/+$/, "");
  return `${base}/${key.replace(/^\/+/, "")}`;
}

/** Upload bytes and return a browser-usable URL. `key` is the object key, e.g. "uploads/123-file.jpg". */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  if (r2Configured) {
    await r2Client().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET!,
        Key: key.replace(/^\/+/, ""),
        Body: body,
        ContentType: contentType,
      })
    );
    return publicUrl(key);
  }

  // Local fallback (dev): write to public/ so the file is served statically.
  const rel = key.startsWith("uploads/") ? key : `uploads/${path.basename(key)}`;
  const abs = path.join(process.cwd(), "public", rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, body);
  return `/${rel}`;
}
