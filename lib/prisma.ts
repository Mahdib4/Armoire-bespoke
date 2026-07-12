import { PrismaClient } from "@prisma/client";

// Ensure the pooled connection is resilient during build/prerender and on
// serverless cold-starts (Neon compute may need a few seconds to wake, and the
// default 10s pool timeout / small pool can time out under concurrent queries).
function resilientUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw || !/^postgres/i.test(raw)) return raw;
  try {
    const u = new URL(raw);
    if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "5");
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "30");
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "30");
    return u.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resilientUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
