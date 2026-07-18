import Link from "next/link";
import Image from "next/image";
import { formatTk } from "@/lib/format";
import { slugify } from "@/lib/slug";

export type FabricSwatch = { name: string; image: string; price: number };

// Fabric swatches — each links to its own detail page (photos + buy by the yard).
export default function FabricSwatches({ swatches }: { swatches: FabricSwatch[] }) {
  return (
    <div className="fabric-swatches">
      {swatches.map((s, i) => (
        <Link
          key={s.name + i}
          href={`/fabric/${slugify(s.name)}`}
          className={`swatch rv sw-${i % 6} ${s.image ? "has-img" : ""}`}
          aria-label={`View ${s.name}`}
        >
          {s.image && (
            <Image src={s.image} alt={s.name} fill sizes="(max-width:640px) 45vw, 200px" className="swatch-img" />
          )}
          <span className="swatch-cap">
            <span className="swatch-name">{s.name}</span>
            {s.price > 0 && <span className="swatch-price tk">{formatTk(s.price)} / yd</span>}
          </span>
        </Link>
      ))}
    </div>
  );
}
