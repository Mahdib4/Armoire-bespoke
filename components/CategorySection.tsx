import Link from "next/link";
import Image from "next/image";
import LazyVideo from "./LazyVideo";
import type { HomeCategory } from "@/lib/data";

// Landing page shows the CATEGORY only (immersive banner + CTA).
// The products for a category are revealed on its dedicated page (/c/[slug]).
export default function CategorySection({
  category,
  index,
}: {
  category: HomeCategory;
  index: number;
}) {
  const isVideo = category.bannerType === "video" && category.bannerUrl;
  return (
    <section id={category.slug} className="cat-sec">
      <Link href={`/c/${category.slug}`} className="cat-banner" aria-label={`Explore ${category.name}`}>
        {isVideo ? (
          <LazyVideo
            className="cat-banner-media"
            src={category.bannerUrl!}
            poster={category.posterUrl || undefined}
          />
        ) : (
          category.bannerUrl && (
            <Image
              src={category.bannerUrl}
              alt={category.name}
              fill
              sizes="100vw"
              className="cat-banner-media"
              priority={index === 0}
            />
          )
        )}
        <div className="cat-banner-ov" />
        <div className="cat-banner-c">
          <span className="eyebrow rv">Collection {String(index + 1).padStart(2, "0")}</span>
          <h2 className="cat-banner-title rv rv-1">{category.name}</h2>
          <p className="cat-banner-tag rv rv-2">{category.tagline}</p>
          <span className="btn btn-ghost rv rv-3 cat-banner-cta">Explore</span>
        </div>
      </Link>
    </section>
  );
}
