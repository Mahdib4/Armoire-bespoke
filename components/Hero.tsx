export default function Hero({
  video,
  poster,
  tagline,
}: {
  video: string;
  poster?: string;
  tagline?: string;
}) {
  return (
    <section id="hero" className="hero">
      <video
        className="hero-vid"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster || undefined}
        data-parallax="0.12"
      >
        <source src={video} type="video/mp4" />
      </video>
      <div className="hero-ov" />
      <div className="hero-c">
        <p className="hero-line rv">
          {tagline || "Where master craft meets timeless elegance — every stitch, a signature of devotion."}
        </p>
      </div>
      <div className="scroll-cue">
        <span>Discover</span>
        <i />
      </div>
    </section>
  );
}
