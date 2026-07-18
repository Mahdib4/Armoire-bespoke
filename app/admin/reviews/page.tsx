import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data";
import ReviewsManager, { type AdminReview } from "@/components/admin/ReviewsManager";

export const dynamic = "force-dynamic";

function parsePhotos(raw: string | null): string[] {
  try {
    const a = JSON.parse(raw || "[]");
    return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default async function AdminReviews() {
  const [rows, settings] = await Promise.all([
    prisma.review
      .findMany({ orderBy: [{ featured: "desc" }, { order: "asc" }, { createdAt: "desc" }] })
      .catch(() => []),
    getSettings(),
  ]);

  const reviews: AdminReview[] = rows.map((r) => ({
    id: r.id,
    author: r.author,
    location: r.location || "",
    rating: r.rating,
    text: r.text,
    photos: parsePhotos(r.photos),
    featured: r.featured,
    order: r.order,
    active: r.active,
  }));

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Customer&rsquo;s Words</h1>
          <p>Reviews shown on the homepage and every product page. Add text and attach photos.</p>
        </div>
      </div>
      <ReviewsManager reviews={reviews} show={settings.reviewsShow !== "0"} />
    </div>
  );
}
