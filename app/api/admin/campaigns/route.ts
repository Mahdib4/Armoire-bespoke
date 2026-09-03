import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().min(1).max(120),
});

/** Start a new campaign. It is created switched off, so the owner can build it
 *  — products, discount, poster — before anything appears on the site. */
export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Give the campaign a name." }, { status: 400 });
  const name = parsed.data.name.trim();

  const slug = await uniqueSlug(
    name,
    async (s) => !!(await prisma.campaign.findUnique({ where: { slug: s } }))
  );
  const last = await prisma.campaign.findFirst({ orderBy: { order: "desc" } });

  const campaign = await prisma.campaign.create({
    data: {
      name,
      slug,
      headline: name,
      order: (last?.order ?? -1) + 1,
      active: false,
    },
  });

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, id: campaign.id, slug: campaign.slug });
}
