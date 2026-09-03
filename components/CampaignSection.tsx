import Link from "next/link";
import ProductRail from "./ProductRail";
import type { CardProduct } from "./ProductCard";

export type CampaignView = {
  slug: string;
  headline: string;
  subhead: string;
  badge: string;
  accent: string;
  ctaLabel: string;
  ctaHref: string;
  products: CardProduct[];
};

/** A live campaign on the homepage: its own heading, offer line and pieces,
 *  with a link through to the full campaign page used in ads. */
export default function CampaignSection({
  campaign,
  currency,
}: {
  campaign: CampaignView;
  currency: string;
}) {
  if (campaign.products.length === 0) return null;

  return (
    <section
      className="camp-sec"
      id={`campaign-${campaign.slug}`}
      style={campaign.accent ? ({ "--camp-accent": campaign.accent } as React.CSSProperties) : undefined}
    >
      <div className="sec-head">
        <div>
          <span className="eyebrow">{campaign.badge || "Campaign"}</span>
          <h2 className="sec-title font-display">{campaign.headline}</h2>
          {campaign.subhead && <p className="camp-sub">{campaign.subhead}</p>}
        </div>
        <div className="rule" />
      </div>

      <ProductRail products={campaign.products} currency={currency} />

      <div className="camp-cta">
        <Link href={campaign.ctaHref || `/campaign/${campaign.slug}`} className="btn btn-solid">
          {campaign.ctaLabel || "See the full campaign"}
        </Link>
      </div>
    </section>
  );
}
