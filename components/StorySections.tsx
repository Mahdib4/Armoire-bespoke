import Link from "next/link";
import Image from "next/image";
import GoldDust from "./GoldDust";
import FabricSwatches from "./FabricSwatches";

type Section = { title?: string | null; subtitle?: string | null; body?: string | null; config?: string | null };

export function Storytelling({
  section,
  image,
}: {
  section?: Section;
  image?: string;
}) {
  return (
    <section id="storytelling" className="sec story-sec">
      <div className="story-grid">
        <div className="story-media rv" data-parallax="-0.06">
          {image && (
            <Image src={image} alt="Armoire atelier" fill sizes="(max-width:900px) 100vw, 46vw" className="story-img" />
          )}
        </div>
        <div className="story-copy">
          <span className="eyebrow rv">{section?.subtitle || "Craft as devotion"}</span>
          <h2 className="sec-title rv rv-1" style={{ textAlign: "left" }}>
            {section?.title || "The Armoire Story"}
          </h2>
          <p className="story-body rv rv-2">{section?.body}</p>
          <Link href="#fabric" className="btn rv rv-3">
            Our Craft
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Lookbook({
  section,
  looks,
}: {
  section?: Section;
  looks: { url: string; category: string; product: string; slug: string }[];
}) {
  // Duplicate the set so the marquee loops seamlessly.
  const loop = looks.length ? [...looks, ...looks] : [];
  return (
    <section id="lookbook" className="sec lookbook-sec">
      <div className="sec-head">
        <div className="sec-title rv">{section?.title || "The Lookbook"}</div>
        <div className="sec-sub rv rv-1">{section?.subtitle || "A study in silhouette"}</div>
        <div className="rule" />
      </div>
      <div className="lb-marquee">
        <div className="lb-track" style={{ ["--lb-count" as string]: looks.length }}>
          {loop.map((l, i) => (
            <Link key={l.slug + i} href={`/p/${l.slug}`} className="lb-card" aria-hidden={i >= looks.length}>
              <Image
                src={l.url}
                alt={l.product}
                fill
                sizes="(max-width:640px) 62vw, 22vw"
                className="lb-card-img"
              />
              <div className="lb-cap">
                <span>{l.category}</span>
                <strong>{l.product}</strong>
              </div>
            </Link>
          ))}
        </div>
        <div className="lb-fade left" />
        <div className="lb-fade right" />
      </div>
    </section>
  );
}

type Swatch = string | { name: string; image?: string; price?: number | string };

export function Fabric({
  section,
}: {
  section?: Section;
}) {
  let raw: Swatch[] = [];
  try {
    raw = section?.config ? JSON.parse(section.config).swatches ?? [] : [];
  } catch {}
  // Accept legacy string swatches and { name, image, price } objects.
  // price = Tk per yard (0/blank hides the price line).
  const swatches = raw.map((s) =>
    typeof s === "string"
      ? { name: s, image: "", price: 0 }
      : { name: s.name, image: s.image || "", price: Number(s.price) || 0 }
  );
  return (
    <section id="fabric" className="sec fabric-sec">
      <GoldDust className="fabric-dust" density={90} />
      <div className="sec-head">
        <div className="sec-title rv">{section?.title || "The Fabric Collection"}</div>
        <div className="sec-sub rv rv-1">{section?.subtitle || "Cloth chosen with intent"}</div>
        <div className="rule" />
      </div>
      <p className="fabric-body rv rv-2">{section?.body}</p>
      <FabricSwatches swatches={swatches} />
    </section>
  );
}
