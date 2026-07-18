import "server-only";
import nodemailer from "nodemailer";
import { formatTk } from "./format";

type OrderLine = {
  productName: string;
  type: string;
  priceTk: number;
  qty: number;
  selections?: Record<string, string> | null;
  measurements?: Record<string, string> | null;
};

export type OrderEmailData = {
  publicId: string;
  customerName: string;
  email: string;
  phone: string;
  address?: string | null;
  city?: string | null;
  note?: string | null;
  subtotalTk: number;
  items: OrderLine[];
};

function transport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null; // preview mode
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user, pass },
  });
}

const GOLD = "#c9a84c";
const BG = "#0e0e0e";
const CARD = "#161616";
const IVORY = "#f5f0e8";

function lineRows(items: OrderLine[]): string {
  return items
    .map((it) => {
      const opts = it.selections
        ? Object.entries(it.selections)
            .map(([k, v]) => `${k}: <b>${v}</b>`)
            .join(" &nbsp;·&nbsp; ")
        : "";
      const meas = it.measurements
        ? Object.entries(it.measurements)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : "";
      return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #262626;color:${IVORY};font-family:Georgia,serif">
          <div style="font-size:15px">${it.productName} <span style="color:#8f8a80;font-size:12px">× ${it.qty}</span></div>
          <div style="color:${GOLD};font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin-top:3px">${
            it.type === "CUSTOM" ? "Made-to-Measure" : it.type === "FABRIC" ? "Fabric (by the yard)" : "Ready-Made"
          }</div>
          ${opts ? `<div style="color:#b8b2a6;font-size:12px;margin-top:6px">${opts}</div>` : ""}
          ${meas ? `<div style="color:#7d7870;font-size:11px;margin-top:4px">Measurements — ${meas}</div>` : ""}
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #262626;color:${IVORY};text-align:right;font-family:Georgia,serif;white-space:nowrap">${formatTk(
          it.priceTk * it.qty
        )}</td>
      </tr>`;
    })
    .join("");
}

function shell(title: string, intro: string, o: OrderEmailData): string {
  return `
  <div style="background:${BG};padding:32px 0;font-family:Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;background:${CARD};border:1px solid #242424">
      <div style="padding:34px 34px 20px;text-align:center;border-bottom:1px solid #242424">
        <div style="font-family:Georgia,serif;letter-spacing:.34em;color:${IVORY};font-size:24px">ARMOIRE</div>
        <div style="color:${GOLD};font-style:italic;font-family:Georgia,serif;font-size:13px;margin-top:2px">Bespoke</div>
      </div>
      <div style="padding:30px 34px">
        <h1 style="color:${IVORY};font-family:Georgia,serif;font-weight:normal;font-size:22px;margin:0 0 6px">${title}</h1>
        <p style="color:#b8b2a6;font-size:14px;line-height:1.6;margin:0 0 22px">${intro}</p>
        <div style="color:#8f8a80;font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px">Order</div>
        <div style="color:${GOLD};font-family:Georgia,serif;font-size:18px;margin-bottom:20px">${o.publicId}</div>
        <table style="width:100%;border-collapse:collapse">${lineRows(o.items)}
          <tr>
            <td style="padding:16px 0 0;color:${IVORY};font-family:Georgia,serif;font-size:16px">Total</td>
            <td style="padding:16px 0 0;text-align:right;color:${GOLD};font-family:Georgia,serif;font-size:18px">${formatTk(
              o.subtotalTk
            )}</td>
          </tr>
        </table>
        <div style="margin-top:26px;padding-top:20px;border-top:1px solid #242424;color:#b8b2a6;font-size:13px;line-height:1.7">
          <div style="color:#8f8a80;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">Client</div>
          ${o.customerName}<br/>${o.email} · ${o.phone}
          ${o.address ? `<br/>${o.address}${o.city ? ", " + o.city : ""}` : ""}
          ${o.note ? `<br/><span style="color:#7d7870">Note: ${o.note}</span>` : ""}
        </div>
      </div>
      <div style="padding:20px 34px;border-top:1px solid #242424;text-align:center;color:#6d685f;font-size:11px;letter-spacing:.06em">
        Armoire Bespoke · Dhanmondi, Dhaka · Tailored to define you
      </div>
    </div>
  </div>`;
}

export type EnquiryEmailData = {
  name: string;
  phone: string;
  email?: string | null;
  subject?: string | null;
  message?: string | null;
  type: string;
  appointment?: string | null;
  photos?: string[]; // absolute or site-relative image URLs (e.g. inspiration uploads)
};

function absUrl(u: string): string {
  if (/^https?:\/\//.test(u)) return u;
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${u.startsWith("/") ? "" : "/"}${u}`;
}

/** Notifies the owner of a new customer enquiry / appointment / inspiration request. */
export async function sendEnquiryEmail(e: EnquiryEmailData): Promise<{ sent: boolean }> {
  const owner = process.env.OWNER_EMAIL;
  const t = transport();
  const from = process.env.MAIL_FROM || "Armoire Bespoke <no-reply@armoirebespoke.com>";
  const label =
    e.type === "appointment"
      ? "Appointment request"
      : e.type === "inspiration"
        ? "Inspiration request"
        : "New enquiry";
  const photos = e.photos ?? [];

  if (!t || !owner) {
    console.log(`\n[email:preview] ${label} from ${e.name} <${e.phone}${e.email ? " / " + e.email : ""}>`);
    if (e.appointment) console.log(`[email:preview] preference: ${e.appointment}`);
    if (e.message) console.log(`[email:preview] message: ${e.message}`);
    if (photos.length) console.log(`[email:preview] photos: ${photos.map(absUrl).join(", ")}`);
    return { sent: false };
  }

  const photosHtml = photos.length
    ? `<div style="margin-top:16px;border-top:1px solid #242424;padding-top:16px">
         <div style="color:#8f8a80;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">Attached inspiration (${photos.length})</div>
         ${photos
           .map(
             (p) =>
               `<a href="${absUrl(p)}" style="display:inline-block;margin:0 6px 6px 0"><img src="${absUrl(
                 p
               )}" width="90" height="110" style="object-fit:cover;border:1px solid #333"/></a>`
           )
           .join("")}
       </div>`
    : "";

  const html = `
  <div style="background:${BG};padding:28px 0;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:${CARD};border:1px solid #242424;padding:28px 30px">
      <div style="color:${GOLD};font-family:Georgia,serif;letter-spacing:.2em;font-size:12px;text-transform:uppercase">${label}</div>
      <h1 style="color:${IVORY};font-family:Georgia,serif;font-weight:normal;font-size:20px;margin:8px 0 16px">${e.name}</h1>
      <table style="width:100%;color:#b8b2a6;font-size:14px;line-height:1.8">
        <tr><td style="color:#8f8a80;width:120px">Phone</td><td>${e.phone}</td></tr>
        ${e.email ? `<tr><td style="color:#8f8a80">Email</td><td>${e.email}</td></tr>` : ""}
        ${e.appointment ? `<tr><td style="color:#8f8a80">Preference</td><td style="color:${GOLD}">${e.appointment}</td></tr>` : ""}
        ${e.subject ? `<tr><td style="color:#8f8a80">Subject</td><td>${e.subject}</td></tr>` : ""}
      </table>
      ${e.message ? `<p style="color:${IVORY};font-size:14px;line-height:1.7;margin-top:16px;border-top:1px solid #242424;padding-top:16px;white-space:pre-wrap">${e.message}</p>` : ""}
      ${photosHtml}
    </div>
  </div>`;

  await t.sendMail({
    from,
    to: owner,
    replyTo: e.email || undefined,
    subject: `${label} — ${e.name} (${e.phone})`,
    html,
    attachments: photos.map((p) => ({ path: absUrl(p) })),
  });
  return { sent: true };
}

export async function sendOrderEmails(o: OrderEmailData): Promise<{ sent: boolean }> {
  const t = transport();
  const from = process.env.MAIL_FROM || "Armoire Bespoke <no-reply@armoirebespoke.com>";
  const owner = process.env.OWNER_EMAIL;

  const customerHtml = shell(
    "Thank you — your order is received",
    `Dear ${o.customerName}, we've received your bespoke order. Our atelier will call you shortly to schedule your measurement and fitting appointment.`,
    o
  );
  const ownerHtml = shell(
    "New order received",
    `A new order has been placed by ${o.customerName}. Contact the client to arrange the fitting.`,
    o
  );

  if (!t) {
    console.log("\n[email:preview] SMTP not configured — emails not sent.");
    console.log(`[email:preview] -> customer <${o.email}> : Order ${o.publicId} (${formatTk(o.subtotalTk)})`);
    if (owner) console.log(`[email:preview] -> owner <${owner}> : New order ${o.publicId}`);
    return { sent: false };
  }

  await t.sendMail({
    from,
    to: o.email,
    subject: `Armoire Bespoke — Order ${o.publicId} received`,
    html: customerHtml,
  });
  if (owner) {
    await t.sendMail({
      from,
      to: owner,
      subject: `New order ${o.publicId} — ${o.customerName}`,
      html: ownerHtml,
    });
  }
  return { sent: true };
}
