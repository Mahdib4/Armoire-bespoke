// Generate VAPID keys for Web Push and append them to .env if not already present.
import webpush from "web-push";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
let env = readFileSync(envPath, "utf8");

if (/VAPID_PUBLIC_KEY/.test(env)) {
  console.log("VAPID keys already present in .env");
} else {
  const k = webpush.generateVAPIDKeys();
  env +=
    "\n# Web Push (VAPID) — admin browser notifications\n" +
    `VAPID_PUBLIC_KEY="${k.publicKey}"\n` +
    `VAPID_PRIVATE_KEY="${k.privateKey}"\n` +
    `VAPID_SUBJECT="mailto:omnidezx@gmail.com"\n`;
  writeFileSync(envPath, env);
  console.log("VAPID keys appended to .env");
}
