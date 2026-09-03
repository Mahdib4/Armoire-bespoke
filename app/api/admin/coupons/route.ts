import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeCode } from "@/lib/coupon";

export const runtime = "nodejs";

const Schema = z.object({
  code: z.string().min(2).max(40),
});

/** Create a coupon code. It starts as 10% off with no limits; every rule is
 *  then set on the card that appears. */
export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a code." }, { status: 400 });

  const code = normalizeCode(parsed.data.code);
  if (!/^[A-Z0-9-]+$/.test(code)) {
    return NextResponse.json(
      { error: "Use letters, numbers and dashes only — no spaces." },
      { status: 400 }
    );
  }

  const clash = await prisma.coupon.findUnique({ where: { code } });
  if (clash) return NextResponse.json({ error: `"${code}" already exists.` }, { status: 409 });

  const coupon = await prisma.coupon.create({
    data: { code, type: "percent", value: 10, active: true },
  });
  return NextResponse.json({ ok: true, id: coupon.id, code: coupon.code });
}
