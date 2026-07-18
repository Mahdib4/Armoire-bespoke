import Link from "next/link";

// Landing-page invitation to the Share Your Inspiration page. If the admin has
// uploaded an inspiration hero image/video in Site Settings, it's shown here as
// a background (same media used on the /inspiration page).
export default function InspirationBand({
  image,
  video,
  poster,
}: {
  image?: string;
  video?: string;
  poster?: string;
}) {
  const hasMedia = Boolean(image || video);
  return (
    <section id="inspiration" className={`insp-band${hasMedia ? " has-media" : ""}`}>
      {image ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="insp-band-bg" src={image} alt="" />
      ) : video ? (
        <video className="insp-band-bg" autoPlay muted loop playsInline preload="metadata" poster={poster || undefined}>
          <source src={video} type="video/mp4" />
        </video>
      ) : null}
      {hasMedia && <div className="insp-band-ov" />}
      <div className="insp-band-c">
        <span className="eyebrow rv">Bespoke, your way</span>
        <h2 className="sec-title rv rv-1">Share Your Inspiration</h2>
        <p className="insp-band-body rv rv-2">
          Seen a look you love that isn&apos;t on our website? Send us your photos and details —
          our atelier will craft it for you, made to measure.
        </p>
        <Link href="/inspiration" className="btn btn-solid rv rv-3">
          Share Your Idea
        </Link>
      </div>
    </section>
  );
}
