import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export const runtime = "nodejs";

const Discount = z.enum(["none", "percent", "fixed"]);

const ItemSchema = z.object({
  productId: z.string().min(1),
  /** null = follow the campaign's own discount. */
  discountType: Discount.nullable().optional(),
  discountValue: z.number().int().min(0).max(1000000).nullable().optional(),
  badgeText: z.string().max(40).nullable().optional(),
  showBadge: z.boolean().optional(),
});

const Schema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z.string().max(80).optional(),
  headline: z.string().max(160).nullable().optional(),
  subhead: z.string().max(300).nullable().optional(),
  description: z.string().max(4000).nullable().optional(),
  discountType: Discount.optional(),
  discountValue: z.number().int().min(0).max(1000000).optional(),
  badgeText: z.string().max(40).nullable().optional(),
  showBadges: z.boolean().optional(),
  blockCoupons: z.boolean().optional(),
  accent: z.string().max(20).nullable().optional(),
  bannerType: z.enum(["image", "video"]).optional(),
  bannerUrl: z.string().max(500).nullable().optional(),
  posterUrl: z.string().max(500).nullable().optional(),
  ctaLabel: z.string().max(60).nullable().optional(),
  ctaHref: z.string().max(500).nullable().optional(),
  // ISO strings from <input type="datetime-local">; "" clears the schedule.
  startsAt: z.string().max(40).nullable().optional(),
  endsAt: z.string().max(40).nullable().optional(),
  active: z.boolean().optional(),
  showOnHome: z.boolean().optional(),
  popupShow: z.boolean().optional(),
  popupImage: z.string().max(500).nullable().optional(),
  popupTitle: z.string().max(160).nullable().optional(),
  popupBody: z.string().max(600).nullable().optional(),
  popupCta: z.string().max(60).nullable().optional(),
  popupHref: z.string().max(500).nullable().optional(),
  order: z.number().int().optional(),
  items: z.array(ItemSchema).max(300).optional(),
});

/** "" / null → null, otherwise a Date (invalid input is ignored rather than
 *  wiping the existing schedule). */
function toDate(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v.trim() === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // The slug is the campaign's ad URL, so it may be edited — but it has to stay
  // unique and URL-safe, and a clash keeps the current one rather than failing.
  let slug: string | undefined;
  if (d.slug !== undefined) {
    const wanted = slugify(d.slug);
    if (wanted && wanted !== existing.slug) {
      const clash = await prisma.campaign.findUnique({ where: { slug: wanted } });
      if (clash) {
        return NextResponse.json(
          { error: `The link "/campaign/${wanted}" is already used by another campaign.` },
          { status: 409 }
        );
      }
      slug = wanted;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id },
      data: {
        name: d.name,
        slug,
        headline: d.headline,
        subhead: d.subhead,
        description: d.description,
        discountType: d.discountType,
        discountValue: d.discountValue,
        badgeText: d.badgeText,
        showBadges: d.showBadges,
        blockCoupons: d.blockCoupons,
        accent: d.accent,
        bannerType: d.bannerType,
        bannerUrl: d.bannerUrl,
        posterUrl: d.posterUrl,
        ctaLabel: d.ctaLabel,
        ctaHref: d.ctaHref,
        startsAt: toDate(d.startsAt),
        endsAt: toDate(d.endsAt),
        active: d.active,
        showOnHome: d.showOnHome,
        popupShow: d.popupShow,
        popupImage: d.popupImage,
        popupTitle: d.popupTitle,
        popupBody: d.popupBody,
        popupCta: d.popupCta,
        popupHref: d.popupHref,
        order: d.order,
      },
    });

    if (d.items) {
      // Rewrite the line-up in one go: dropped products go, new ones arrive,
      // and the order sent is the order shown.
      const valid = new Set(
        (
          await tx.product.findMany({
            where: { id: { in: d.items.map((i) => i.productId) } },
            select: { id: true },
          })
        ).map((p) => p.id)
      );
      await tx.campaignProduct.deleteMany({ where: { campaignId: id } });
      const seen = new Set<string>();
      const rows = d.items
        .filter((i) => {
          if (!valid.has(i.productId) || seen.has(i.productId)) return false;
          seen.add(i.productId);
          return true;
        })
        .map((i, order) => ({
          campaignId: id,
          productId: i.productId,
          discountType: i.discountType ?? null,
          discountValue: i.discountType ? (i.discountValue ?? 0) : null,
          badgeText: i.badgeText || null,
          showBadge: i.showBadge !== false,
          order,
        }));
      if (rows.length) await tx.campaignProduct.createMany({ data: rows });
    }
  });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, slug: slug ?? existing.slug });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.campaign.delete({ where: { id } }).catch(() => null);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
