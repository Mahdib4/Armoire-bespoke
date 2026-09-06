import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CampaignEditor from "@/components/admin/CampaignEditor";
import { isDiscountType, type DiscountType } from "@/lib/campaign";

export const dynamic = "force-dynamic";

/** A Date as the value a <input type="datetime-local"> expects, in local time. */
function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [campaign, products] = await Promise.all([
    prisma.campaign
      .findUnique({ where: { id }, include: { items: { orderBy: { order: "asc" } } } })
      .catch(() => null),
    prisma.product.findMany({
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
      include: {
        category: { select: { name: true } },
        images: { orderBy: { order: "asc" }, take: 1 },
      },
    }),
  ]);
  if (!campaign) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.armoirebespoke.com";

  return (
    <div>
      <div className="adm-head">
        <div>
          <Link href="/admin/campaigns" className="adm-back">
            ← Campaigns
          </Link>
          <h1>{campaign.name}</h1>
          <p>
            <Link href={`/campaign/${campaign.slug}`} target="_blank" className="adm-link">
              View campaign page ↗
            </Link>{" "}
            — the link to point your Facebook and Instagram ads at.
          </p>
        </div>
      </div>

      <CampaignEditor
        siteUrl={siteUrl}
        campaign={{
          id: campaign.id,
          name: campaign.name,
          slug: campaign.slug,
          headline: campaign.headline || "",
          subhead: campaign.subhead || "",
          description: campaign.description || "",
          discountType: (isDiscountType(campaign.discountType)
            ? campaign.discountType
            : "none") as DiscountType,
          discountValue: campaign.discountValue,
          badgeText: campaign.badgeText || "",
          showBadges: campaign.showBadges,
          blockCoupons: campaign.blockCoupons,
          accent: campaign.accent || "",
          bannerType: campaign.bannerType === "video" ? "video" : "image",
          bannerUrl: campaign.bannerUrl || "",
          posterUrl: campaign.posterUrl || "",
          ctaLabel: campaign.ctaLabel || "",
          ctaHref: campaign.ctaHref || "",
          startsAt: toLocalInput(campaign.startsAt),
          endsAt: toLocalInput(campaign.endsAt),
          active: campaign.active,
          showOnHome: campaign.showOnHome,
          popupShow: campaign.popupShow,
          popupImage: campaign.popupImage || "",
          popupTitle: campaign.popupTitle || "",
          popupBody: campaign.popupBody || "",
          popupCta: campaign.popupCta || "",
          popupHref: campaign.popupHref || "",
          order: campaign.order,
          items: campaign.items.map((i) => ({
            productId: i.productId,
            discountType: (isDiscountType(i.discountType) ? i.discountType : "") as
              | ""
              | DiscountType,
            discountValue: i.discountValue ?? 0,
            badgeText: i.badgeText || "",
            showBadge: i.showBadge,
          })),
        }}
        products={products.map((p) => ({
          id: p.id,
          name: p.name,
          categoryName: p.category.name,
          type: p.type,
          image: p.images[0]?.url ?? "",
        }))}
      />
    </div>
  );
}
