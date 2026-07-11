import Link from "next/link";
import type { Settings } from "@/lib/data";

export default function Footer({
  settings,
  categories,
}: {
  settings: Settings;
  categories: { slug: string; name: string }[];
}) {
  return (
    <footer id="contact" className="ab-footer">
      <div className="ab-foot-grid">
        <div className="ab-foot-brand">
          <div className="font-display ab-foot-word">{settings.brandShort || "ARMOIRE"}</div>
          <div className="font-serif-i ab-foot-be">Bespoke</div>
          <p className="ab-foot-note">{settings.footerNote}</p>
        </div>

        <div className="ab-foot-col">
          <h4>Collections</h4>
          {categories.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </div>

        <div className="ab-foot-col">
          <h4>Atelier</h4>
          <Link href="/#storytelling">Our Story</Link>
          <Link href="/#lookbook">Lookbook</Link>
          <Link href="/#fabric">Fabric Collection</Link>
        </div>

        <div className="ab-foot-col">
          <h4>Visit</h4>
          <span>{settings.address}</span>
          {settings.contactPhone && <a href={`tel:${settings.contactPhone}`}>{settings.contactPhone}</a>}
          {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>}
          <a href={`mailto:${settings.contactEmail}`} className="btn btn-ghost ab-foot-cta">
            Book Consultation
          </a>
        </div>
      </div>
      <div className="ab-foot-base">
        <span>© {new Date().getFullYear()} {settings.brandName || "Armoire Bespoke"}</span>
        <span>{settings.slogan}</span>
      </div>
    </footer>
  );
}
