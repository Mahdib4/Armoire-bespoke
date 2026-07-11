import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCredentials, establishSession } from "@/lib/auth";

export const runtime = "nodejs";

const Schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  await establishSession(user.id, user.email);
  return NextResponse.json({ ok: true });
}
