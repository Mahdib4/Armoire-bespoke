"use client";
import Link from "next/link";
import Image from "next/image";
import Atropos from "atropos/react";
import "atropos/css";
import { formatTk } from "@/lib/format";

export type CardProduct = {
  slug: string;
  name: string;
  priceTk: number;
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
        </div>
        <div className="pcard-info" data-atropos-offset="3">
          <h3>{product.name}</h3>
          <p className="tk">{formatTk(product.priceTk, currency)}</p>
        </div>
      </Atropos>
    </Link>
  );
}
