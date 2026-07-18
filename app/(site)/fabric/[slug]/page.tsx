import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductGallery from "@/components/ProductGallery";
import FabricPurchase from "@/components/FabricPurchase";
import { getFabricBySlug, getFabrics, getSettings } from "@/lib/data";

export const revalidate = 120;

export async function generateStaticParams() {
  const fabrics = await getFabrics();
  return fabrics.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const fabric = await getFabricBySlug(slug);
  if (!fabric) return { title: "Fabric not found" };
  return { title: `${fabric.name} — Fabric`, description: `${fabric.name} cloth, sold by the yard.` };
}

export default async function FabricDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [fabric, settings] = await Promise.all([getFabricBySlug(slug), getSettings()]);
  if (!fabric) notFound();
  const currency = settings.currency || "Tk";

  // Gallery = cover + extra photos (deduped).
  const urls = [fabric.image, ...fabric.images].filter((u, i, a) => u && a.indexOf(u) === i);
  const gallery = urls.map((url) => ({ url, alt: fabric.name }));

  return (
    <div className="pdp">
      <nav className="pdp-crumb">
        <Link href="/">Home</Link>
        <span>·</span>
        <Link href="/fabrics">Fabrics</Link>
        <span>·</span>
        <em>{fabric.name}</em>
      </nav>

      <div className="pdp-grid">
        {gallery.length > 0 ? (
          <ProductGallery images={gallery} name={fabric.name} />
        ) : (
          <div className="fb-noimg-hero">
            <Image src="/media/brand/logo-dark.png" alt={fabric.name} width={220} height={90} />
            <span>Fabric photos coming soon</span>
          </div>
        )}
        <FabricPurchase
          fabric={{ name: fabric.name, slug: fabric.slug, image: fabric.image, price: fabric.price, currency }}
        />
      </div>

      <div className="clist-back" style={{ marginTop: "3.5rem" }}>
        <Link href="/fabrics" className="btn btn-ghost">← All fabrics</Link>
      </div>
    </div>
  );
}
