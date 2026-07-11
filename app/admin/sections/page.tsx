import { prisma } from "@/lib/prisma";
import SectionEditor from "@/components/admin/SectionEditor";

export const dynamic = "force-dynamic";

const KEYS = ["storytelling", "lookbook", "fabric"];

export default async function AdminSections() {
  const rows = await prisma.section.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1>Sections</h1>
          <p>Edit the narrative sections shown on the homepage.</p>
        </div>
      </div>
      {KEYS.map((key) => {
        const s = byKey.get(key);
        return (
          <SectionEditor
            key={key}
            section={{
              key,
              title: s?.title || "",
              subtitle: s?.subtitle || "",
              body: s?.body || "",
            }}
          />
        );
      })}
    </div>
  );
}
