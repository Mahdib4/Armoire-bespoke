import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEnquiryEmail } from "@/lib/email";

export const runtime = "nodejs";

const Schema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(4).max(40),
  email: z.string().email().optional().or(z.literal("")),
  subject: z.string().max(160).optional(),
  message: z.string().max(1500).optional(),
  type: z.enum(["contact", "appointment"]).default("contact"),
  appointment: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  const parsed = Schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const d = parsed.data;

  const enquiry = await prisma.enquiry.create({
    data: {
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      subject: d.subject || null,
      message: d.message || null,
      type: d.type,
      appointment: d.appointment || null,
    },
  });

  // Notify the owner (best-effort; non-fatal).
  try {
    await sendEnquiryEmail({
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      subject: d.subject || null,
      message: d.message || null,
      type: d.type,
      appointment: d.appointment || null,
    });
  } catch (e) {
    console.error("[enquiries] email failed:", e);
  }

  return NextResponse.json({ ok: true, id: enquiry.id });
}
