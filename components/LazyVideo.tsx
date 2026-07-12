"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Autoplay background video that only loads its source and plays while near the
 * viewport, and pauses when scrolled away — so several banner videos don't all
 * download and decode at once. Shows the poster until it's time to load.
 */
export default function LazyVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setLoad(true);
            el.play?.().catch(() => {});
          } else {
            el.pause?.();
          }
        }
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
    >
      {load && <source src={src} type="video/mp4" />}
    </video>
  );
}
