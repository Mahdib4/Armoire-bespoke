import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import LazyVideo from "@/components/LazyVideo";
import { getCategoryBySlug, getSettings, getNavCategories } from "@/lib/data";

export const revalidate = 120;

// Prerender each collection at build so clicks are instant (static/CDN).
export async function generateStaticParams() {
  const cats = await getNavCategories();
  return cats.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "Not found" };
  return { title: cat.name, description: cat.description || undefined };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const [cat, settings] = await Promise.all([getCategoryBySlug(slug), getSettings()]);
  if (!cat || !cat.active) notFound();
  const currency = settings.currency || "Tk";
  const isVideo = cat.bannerType === "video" && cat.bannerUrl;

  const readyMade = cat.products.filter((p) => p.type === "READYMADE");
  const tailorMade = cat.products.filter((p) => p.type !== "READYMADE");

  const renderGrid = (list: typeof cat.products) => (
    <div className="clist-grid">
      {list.map((p) => (
        <ProductCard
          key={p.slug}
          currency={currency}
          product={{
            slug: p.slug,
            name: p.name,
            priceTk: p.priceTk,
            type: p.type,
            images: p.images.map((im) => ({ url: im.url, alt: im.alt })),
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="clist">
      <div className="clist-banner">
        {isVideo ? (
          <LazyVideo className="cat-banner-media" src={cat.bannerUrl!} poster={cat.posterUrl || undefined} />
        ) : (
          cat.bannerUrl && (
            <Image src={cat.bannerUrl} alt={cat.name} fill sizes="100vw" className="cat-banner-media" priority />
          )
        )}
        <div className="cat-banner-ov" />
        <div className="cat-banner-c">
          <span className="eyebrow">The Collection</span>
          <h1 className="cat-banner-title">{cat.name}</h1>
          <p className="cat-banner-tag">{cat.tagline}</p>
        </div>
      </div>

      <div className="clist-intro">
        <p>{cat.description}</p>
        <span className="clist-count">{cat.products.length} pieces</span>
      </div>

      {/* Ready Made — finished, in-stock pieces for immediate purchase */}
      {readyMade.length > 0 && (
        <section className="cgroup" id="ready-made">
          <div className="cgroup-head">
            <span className="eyebrow">In Stock · Immediate Purchase</span>
            <h2 className="cgroup-title">Ready Made</h2>
            <p className="cgroup-sub">
              Finished pieces, already crafted and ready to wear. Choose your size and colour — available for
              immediate purchase.
            </p>
          </div>
          {renderGrid(readyMade)}
        </section>
      )}

      {/* Tailor Made — individually crafted to the client's measurements */}
      {tailorMade.length > 0 && (
        <section className="cgroup" id="tailor-made">
          <div className="cgroup-head">
            <span className="eyebrow">Made to Measure</span>
            <h2 className="cgroup-title">Tailor Made</h2>
            <p className="cgroup-sub">
              Individually crafted to your measurements and design preferences — fabric, cut and detailing
              chosen by you, finished at your fitting.
            </p>
          </div>
          {renderGrid(tailorMade)}
        </section>
      )}

      {cat.products.length === 0 && (
        <p className="clist-empty">This collection is being tailored. Please check back soon.</p>
      )}

      <div className="clist-back">
        <Link href="/#lookbook" className="btn btn-ghost">
          ← Back to collections
        </Link>
      </div>
    </div>
  );
}
