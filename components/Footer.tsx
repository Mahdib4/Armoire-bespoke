import Link from "next/link";
import SocialIcons from "./SocialIcons";
import { waLink } from "@/lib/whatsapp";
import type { Settings } from "@/lib/data";

export default function Footer({
  settings,
  categories,
}: {
  settings: Settings;
  categories: { slug: string; name: string }[];
}) {
  const logo = settings.logoDark || "/media/brand/logo-dark.png";
  const tagline = settings.slogan || "Tailored to Define You";
  return (
    <footer id="contact" className="ab-footer">
      <div className="ab-foot-grid">
        <div className="ab-foot-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={settings.brandName || "Armoire Bespoke"} className="ab-foot-logo" />
          <div className="ab-foot-tagline">{tagline}</div>
          <p className="ab-foot-note">{settings.footerNote}</p>
          <SocialIcons facebook={settings.facebook} instagram={settings.instagram} className="ab-foot-social" />
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
          <Link href="/#appointment">Book Consultation</Link>
        </div>

        <div className="ab-foot-col">
          <h4>Visit</h4>
          <span>{settings.address}</span>
          {settings.contactPhone && <a href={`tel:${settings.contactPhone}`}>{settings.contactPhone}</a>}
          {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>}
          {settings.whatsapp && (
            <a
              href={waLink(settings.whatsapp, "Hello Armoire Bespoke, I'd like to enquire about your tailoring.")}
              target="_blank"
              rel="noopener noreferrer"
              className="ab-foot-wa"
            >
              ✆ WhatsApp us
            </a>
          )}
          <Link href="/#appointment" className="btn btn-ghost ab-foot-cta">
            Book Consultation
          </Link>
        </div>
      </div>
      <div className="ab-foot-base">
        <span>© {new Date().getFullYear()} {settings.brandName || "Armoire Bespoke"}</span>
        <span className="ab-foot-credit">
          Crafted by{" "}
          <a href="https://zeriotic.com/" target="_blank" rel="noopener noreferrer">
            Zeriotic
          </a>
        </span>
        <span>{tagline}</span>
      </div>
    </footer>
  );
}
