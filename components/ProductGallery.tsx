"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

export type GalleryImage = { url: string; alt: string | null };

export default function ProductGallery({
  images,
  name,
}: {
  images: GalleryImage[];
  name: string;
}) {
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);
  const total = images.length || 1;

  const go = useCallback(
    (dir: number) => setI((p) => (p + dir + total) % total),
    [total]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const current = images[i] || images[0];

  return (
    <div className="gallery">
      <div
        className="gallery-main"
        onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (startX.current == null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          startX.current = null;
        }}
      >
        {images.map((img, idx) => (
          <Image
            key={img.url}
            src={img.url}
            alt={img.alt || `${name} — view ${idx + 1}`}
            fill
            priority={idx === 0}
            sizes="(max-width:900px) 100vw, 55vw"
            className={`gallery-img ${idx === i ? "active" : ""}`}
          />
        ))}

        {total > 1 && (
          <>
            <button className="gnav prev" aria-label="Previous image" onClick={() => go(-1)}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button className="gnav next" aria-label="Next image" onClick={() => go(1)}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="gcount">
              <span>{String(i + 1).padStart(2, "0")}</span> / {String(total).padStart(2, "0")}
            </div>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="gthumbs no-scrollbar">
          {images.map((img, idx) => (
            <button
              key={img.url}
              className={`gthumb ${idx === i ? "active" : ""}`}
              onClick={() => setI(idx)}
              aria-label={`View ${idx + 1}`}
            >
              <Image src={img.url} alt="" fill sizes="90px" className="gthumb-img" />
            </button>
          ))}
        </div>
      )}
      <span className="sr-only">{current?.alt}</span>
    </div>
  );
}
