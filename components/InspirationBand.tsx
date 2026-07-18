import Link from "next/link";

// Landing-page invitation to the Share Your Inspiration page.
export default function InspirationBand() {
  return (
    <section id="inspiration" className="insp-band">
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
