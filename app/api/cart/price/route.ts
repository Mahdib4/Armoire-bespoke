import { NextResponse } from "next/server";
import { z } from "zod";
import { priceCartLines } from "@/lib/order-pricing";

export const runtime = "nodejs";

const Schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1).max(20),
        selections: z.record(z.string(), z.string()).optional(),
        fabric: z.object({ name: z.string(), yards: z.number() }).optional(),
      })
    )
    .max(30),
});

/**
 * Re-price a bag against the catalogue as it stands right now.
 *
 * A bag keeps the price from the moment something was put in it, so a campaign
 * starting or ending in the meantime would leave it showing yesterday's figure.
 * The order API always re-prices before charging, so nothing wrong was ever
 * taken — this simply keeps what the customer sees honest.
 *
 * Answers line up with what was sent; a line that can no longer be priced (the
 * piece was withdrawn) comes back null.
 */
export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (parsed.data.items.length === 0) return NextResponse.json({ lines: [] });

  try {
    const priced = await priceCartLines(parsed.data.items);
    return NextResponse.json({
      lines: priced.map((l) =>
        l ? { priceTk: l.priceTk, listTk: l.listTk, discountLabel: l.discountLabel } : null
      ),
    });
  } catch {
    // The bag keeps what it has rather than showing an error over a price check.
    return NextResponse.json({ lines: [] });
  }
}
