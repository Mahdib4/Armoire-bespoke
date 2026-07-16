"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { formatTk } from "@/lib/format";

export type FabricSwatch = { name: string; image: string; price: number };

export default function FabricSwatches({ swatches }: { swatches: FabricSwatch[] }) {
  const [open, setOpen] = useState<FabricSwatch | null>(null);

  // Close the detail view on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="fabric-swatches">
        {swatches.map((s, i) => (
          <button
            type="button"
            key={s.name + i}
            className={`swatch rv sw-${i % 6} ${s.image ? "has-img" : ""}`}
            onClick={() => setOpen(s)}
            aria-label={`View ${s.name}`}
          >
            {s.image && (
              <Image src={s.image} alt={s.name} fill sizes="(max-width:640px) 45vw, 200px" className="swatch-img" />
            )}
            <span className="swatch-cap">
              <span className="swatch-name">{s.name}</span>
              {s.price > 0 && <span className="swatch-price tk">{formatTk(s.price)} / yd</span>}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div className="fabric-modal" onClick={() => setOpen(null)} role="dialog" aria-modal="true">
          <div className="fabric-modal-inner" onClick={(e) => e.stopPropagation()}>
            <button className="fabric-modal-x" onClick={() => setOpen(null)} aria-label="Close">
              ✕
            </button>
            <div className="fabric-modal-media">
              {open.image ? (
                <Image src={open.image} alt={open.name} width={760} height={760} className="fabric-modal-img" />
              ) : (
                <div className="fabric-modal-noimg">No fabric photo added yet</div>
              )}
            </div>
            <div className="fabric-modal-info">
              <h3>{open.name}</h3>
              {open.price > 0 && (
                <p className="fabric-modal-price tk">
                  {formatTk(open.price)} <span>/ yard</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
