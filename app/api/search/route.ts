import { NextResponse } from "next/server";
import { getSearchIndex } from "@/lib/data";

export const runtime = "nodejs";
// The catalogue changes rarely, so the index is cached and served from the CDN.
// Admin edits call revalidatePath("/", "layout"), which refreshes this too.
export const revalidate = 300;

/**
 * The whole searchable catalogue in one small payload.
 *
 * The search box downloads this once and then matches locally, so suggestions
 * appear from the very first character with no request per keystroke — and no
 * database round-trip while someone is typing.
 */
export async function GET() {
  try {
    const docs = await getSearchIndex();
    return NextResponse.json(
      { docs },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }
    );
  } catch {
    return NextResponse.json({ docs: [] });
  }
}
