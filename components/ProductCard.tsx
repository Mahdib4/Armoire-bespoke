"use client";
import Link from "next/link";
import Image from "next/image";
import Atropos from "atropos/react";
import "atropos/css";
import { formatTk } from "@/lib/format";

export type CardProduct = {
  slug: string;
  name: string;
  /** What the customer pays — already discounted where a campaign applies. */
  priceTk: number;
  /** The price before the campaign discount; 0 when nothing is discounted. */
  wasTk?: number;
  /** Corner label for a campaign, e.g. "20% OFF". Blank = no label. */
  badge?: string;
  type: string;
  images: { url: string; alt: string | null }[];
};

export default function ProductCard({
  product,
  currency = "Tk",
}: {
  product: CardProduct;
  currency?: string;
}) {
  const img = product.images[0]?.url || "/media/brand/logo-dark.png";
  const hover = product.images[1]?.url;
  const wasPrice = product.wasTk && product.wasTk > product.priceTk ? product.wasTk : 0;
  return (
    <Link href={`/p/${product.slug}`} className="pcard">
      <Atropos
        className="pcard-atropos"
        shadow={false}
        highlight={false}
        rotateXMax={8}
        rotateYMax={8}
      >
        <div className="pcard-media">
          <Image
            src={img}
            alt={product.images[0]?.alt || product.name}
            fill
            sizes="(max-width:640px) 72vw, 340px"
            className="pcard-img base"
            data-atropos-offset="-2"
          />
          {hover && (
            <Image
              src={hover}
              alt=""
              fill
              sizes="(max-width:640px) 72vw, 340px"
              className="pcard-img hover"
              data-atropos-offset="0"
            />
          )}
          <span className="pcard-badge" data-atropos-offset="5">
            {product.type === "CUSTOM" ? "Made-to-Measure" : "Ready-Made"}
          </span>
          {/* Campaign label, top right — switched on per product in the admin panel. */}
          {product.badge && (
            <span className="pcard-off" data-atropos-offset="6">
              {product.badge}
            </span>
          )}
        </div>
        <div className="pcard-info" data-atropos-offset="3">
          <h3>{product.name}</h3>
          <p className="tk">
            {product.type === "CUSTOM" && <em className="pcard-from">Starts from </em>}
            {formatTk(product.priceTk, currency)}
            {wasPrice > 0 && <s className="pcard-was">{formatTk(wasPrice, currency)}</s>}
          </p>
        </div>
      </Atropos>
    </Link>
  );
}
