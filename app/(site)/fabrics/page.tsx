import Link from "next/link";
import type { Metadata } from "next";
import FabricSwatches from "@/components/FabricSwatches";
import GoldDust from "@/components/GoldDust";
import { getFabrics, getSections } from "@/lib/data";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Fabrics",
  description: "The Armoire Bespoke fabric collection — house cloths sold by the yard.",
};

export default async function FabricsPage() {
  const [fabrics, sections] = await Promise.all([getFabrics(), getSections()]);
  const section = sections["fabric"];

  return (
    <div className="clist" style={{ paddingTop: "clamp(5rem, 10vw, 8rem)" }}>
      <section className="sec fabric-sec">
        <GoldDust className="fabric-dust" density={70} />
        <div className="sec-head">
          <div className="sec-title">{section?.title || "The Fabric Collection"}</div>
          <div className="sec-sub">{section?.subtitle || "Cloth chosen with intent"}</div>
          <div className="rule" />
        </div>
        <p className="fabric-body">
          {section?.body ||
            "From English herringbone to Egyptian cotton, every bolt is selected for hand, drape and how it ages. Tap a cloth to see it up close and order it by the yard."}
        </p>
        {fabrics.length > 0 ? (
          <FabricSwatches swatches={fabrics.map((f) => ({ name: f.name, image: f.image, price: f.price }))} />
        ) : (
          <p className="clist-empty">Our fabric collection is being curated. Please check back soon.</p>
        )}
      </section>

      <div className="clist-back">
        <Link href="/" className="btn btn-ghost">← Back home</Link>
      </div>
    </div>
  );
}
