import "server-only";
import webpush from "web-push";
import { prisma } from "./prisma";

let configured = false;

/** Returns true once VAPID details are set; false if keys aren't configured. */
function ensureConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:owner@example.com", publicKey, privateKey);
    configured = true;
  }
  return true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/** Best-effort push to every subscribed admin browser. Prunes dead subscriptions. */
export async function sendAdminPush(payload: PushPayload): Promise<{ sent: number }> {
  if (!ensureConfigured()) {
    console.log(`[push:preview] VAPID not configured — would notify: ${payload.title} — ${payload.body}`);
    return { sent: 0 };
  }
  const subs = await prisma.pushSubscription.findMany();
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        // 404/410 → subscription expired/gone; remove it.
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => {});
        } else {
          console.error("[push] send failed:", code ?? e);
        }
      }
    })
  );
  return { sent };
}
