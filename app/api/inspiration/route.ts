import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEnquiryEmail } from "@/lib/email";
import { sendAdminPush } from "@/lib/push";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(4).max(40),
  email: z.string().email().optional().or(z.literal("")),
  details: z.string().max(2000).optional(),
  photos: z.array(z.string().max(600)).max(12).optional(),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;
  const photos = (d.photos ?? []).filter(Boolean);

  // Store as an enquiry so it appears in the admin dashboard (photo links in the body).
  const message = [d.details?.trim(), photos.length ? `Inspiration photos:\n${photos.join("\n")}` : ""]
    .filter(Boolean)
    .join("\n\n");

  const enquiry = await prisma.enquiry.create({
    data: {
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      subject: "Suit inspiration",
      message: message || null,
      type: "inspiration",
    },
  });

  // Email the owner (same inbox as orders) with the inspiration photos attached.
  try {
    await sendEnquiryEmail({
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      subject: "Suit inspiration",
      message: d.details || null,
      type: "inspiration",
      photos,
    });
  } catch (e) {
    console.error("[inspiration] email failed:", e);
  }

  try {
    await sendAdminPush({
      title: "New inspiration request",
      body: `${d.name} · ${d.phone}${photos.length ? ` · ${photos.length} photo(s)` : ""}`,
      url: "/admin/enquiries",
      tag: "enquiry",
    });
  } catch (e) {
    console.error("[inspiration] push failed:", e);
  }

  return NextResponse.json({ ok: true, id: enquiry.id });
}
