import type { NextConfig } from "next";

// Allow images served from Cloudflare R2 (default r2.dev public URLs, and any
// custom domain provided via R2_PUBLIC_URL) to be optimized by next/image.
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  { protocol: "https", hostname: "**.r2.dev" },
  { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
];

if (process.env.R2_PUBLIC_URL) {
  try {
    const u = new URL(process.env.R2_PUBLIC_URL);
    remotePatterns.push({
      protocol: u.protocol.replace(":", "") as "http" | "https",
      hostname: u.hostname,
    });
  } catch {
    // ignore malformed URL
  }
}

const nextConfig: NextConfig = {
  images: { remotePatterns },
};

export default nextConfig;
