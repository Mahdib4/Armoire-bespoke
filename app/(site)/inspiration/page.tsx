import Image from "next/image";
import type { Metadata } from "next";
import LazyVideo from "@/components/LazyVideo";
import InspirationForm from "@/components/InspirationForm";
import { getSettings } from "@/lib/data";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Share Your Inspiration",
  description:
    "Send us your suit inspiration — upload photos of a look you love and we'll craft it, made to measure.",
};

export default async function InspirationPage() {
  const settings = await getSettings();
  // Image takes priority if set; otherwise a video hero (custom or the mid video).
  const heroImg = settings.inspirationHeroImg;
  const heroUrl = heroImg || settings.inspirationHero || settings.midVideo || "/media/videos/mid.mp4";
  const heroType = heroImg ? "image" : "video";
  const poster = settings.inspirationHeroPoster || undefined;

  return (
    <div className="insp-page">
      <section className="insp-hero">
        {heroType === "video" ? (
          <LazyVideo className="insp-hero-media" src={heroUrl} poster={poster} />
        ) : (
          <Image src={heroUrl} alt="Share your inspiration" fill sizes="100vw" className="insp-hero-media" priority />
        )}
        <div className="insp-hero-ov" />
        <div className="insp-hero-c">
          <span className="eyebrow">Bespoke, your way</span>
          <h1 className="insp-hero-title">Share Your Inspiration</h1>
          <p className="insp-hero-tag">
            The look you dream of — made to measure by Armoire.
          </p>
        </div>
      </section>

      <section className="insp-body">
        <InspirationForm />
      </section>
    </div>
  );
}
