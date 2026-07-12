import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reached only when the request carries a valid admin session (proxy.ts guards
// /api/admin/*). Used by the client AdminBar to decide whether to show itself,
// keeping the public pages free of cookie reads so they can be cached.
export async function GET() {
  return NextResponse.json({ authed: true });
}
