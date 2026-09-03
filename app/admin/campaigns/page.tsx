import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewCampaignForm from "@/components/admin/NewCampaignForm";
import DeleteButton from "@/components/admin/DeleteButton";
import { campaignState, defaultBadgeText, isDiscountType } from "@/lib/campaign";

export const dynamic = "force-dynamic";

const STATE_LABEL: Record<string, string> = {
  live: "Live",
  scheduled: "Scheduled",
  ended: "Ended",
  off: "Off",
};

export default async function AdminCampaigns() {
  const campaigns = await prisma.campaign
    .findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { items: true } } },
    })
    .catch(() => []);

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Campaigns &amp; Discounts</h1>
          <p>
            Build a promotion from any products you like, give it a discount, and run ads straight to
            its own page. Nothing shows on the site until a campaign is Live.
          </p>
        </div>
      </div>

      <NewCampaignForm />

      {campaigns.length === 0 ? (
        <div className="adm-panel">
          <p className="adm-hint" style={{ margin: 0 }}>
            No campaigns yet. Create one above — you can add pieces from every collection, set a
            percentage or flat discount, schedule it, and choose whether visitors are greeted with a
            poster.
          </p>
        </div>
      ) : (
        <div className="adm-panel">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Offer</th>
                <th>Pieces</th>
                <th>Runs</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const state = campaignState(c);
                const offer =
                  c.badgeText ||
                  defaultBadgeText(
                    isDiscountType(c.discountType) ? c.discountType : "none",
                    c.discountValue
                  ) ||
                  "—";
                const fmt = (d: Date | null) =>
                  d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null;
                const from = fmt(c.startsAt);
                const to = fmt(c.endsAt);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/campaigns/${c.id}`} className="adm-link">
                        {c.name}
                      </Link>
                      <div className="adm-sub-count">/campaign/{c.slug}</div>
                    </td>
                    <td>{offer}</td>
                    <td>{c._count.items}</td>
                    <td>
                      {from || to ? `${from ?? "now"} → ${to ?? "ongoing"}` : "Always while Live"}
                    </td>
                    <td>
                      <span className={`adm-badge ${state === "live" ? "on" : "off"}`}>
                        {STATE_LABEL[state]}
                      </span>
                      {c.popupShow && (
                        <span className="adm-badge custom" style={{ marginLeft: 4 }}>
                          Poster
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="adm-row-actions">
                        <Link href={`/admin/campaigns/${c.id}`} className="adm-btn sm">
                          Edit
                        </Link>
                        {state === "live" && (
                          <Link href={`/campaign/${c.slug}`} target="_blank" className="adm-btn sm">
                            View ↗
                          </Link>
                        )}
                        <DeleteButton
                          endpoint={`/api/admin/campaigns/${c.id}`}
                          confirmMsg={`Delete "${c.name}"? The products themselves are not touched.`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
