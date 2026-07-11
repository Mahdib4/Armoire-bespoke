export default function QuoteBand({
  text,
  attribution,
  background,
}: {
  text: string;
  attribution?: string | null;
  background?: string;
}) {
  if (!text) return null;
  return (
    <section className="quote-band" style={background ? { background } : undefined}>
      <div className="qb-inner rv">
        <span className="qb-wing left" aria-hidden />
        <div className="qb-core">
          <span className="qb-mark open" aria-hidden>
            &#8220;
          </span>
          <span className="qb-mark close" aria-hidden>
            &#8221;
          </span>
          <p className="qb-text">{text}</p>
          {attribution && <cite className="qb-cite">{attribution}</cite>}
        </div>
        <span className="qb-wing right" aria-hidden />
      </div>
    </section>
  );
}
