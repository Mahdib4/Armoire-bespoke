import { prisma } from "@/lib/prisma";
import QuotesManager from "@/components/admin/QuotesManager";

export const dynamic = "force-dynamic";

export default async function AdminQuotes() {
  const quotes = await prisma.quote.findMany({ orderBy: { order: "asc" } });
  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Quotes</h1>
          <p>The brand quote (<b>manifesto</b>) and the interstitial quotes between sections.</p>
        </div>
      </div>
      <QuotesManager quotes={quotes.map((q) => ({ id: q.id, slot: q.slot, text: q.text, attribution: q.attribution }))} />
    </div>
  );
}
