import { prisma } from "@/lib/prisma";
import MediaManager from "@/components/admin/MediaManager";

export const dynamic = "force-dynamic";

export default async function AdminMedia() {
  const media = await prisma.media.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Media Library</h1>
          <p>Upload and manage images &amp; videos, then reference their URLs anywhere.</p>
        </div>
      </div>
      <MediaManager media={media.map((m) => ({ id: m.id, url: m.url, type: m.type }))} />
    </div>
  );
}
