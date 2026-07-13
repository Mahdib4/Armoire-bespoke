"use client";
import { useEffect, useState } from "react";

type State = "loading" | "unsupported" | "off" | "working" | "enabled" | "blocked" | "unconfigured" | "error";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushToggle() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setState(sub ? "enabled" : "off"))
      .catch(() => setState("off"));
  }, []);

  const enable = async () => {
    try {
      setState("working");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("blocked");
        return;
      }
      const keyRes = await fetch("/api/admin/push");
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        setState("unconfigured");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const res = await fetch("/api/admin/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setState("enabled");
    } catch (e) {
      console.error("[push]", e);
      setState("error");
    }
  };

  if (state === "loading" || state === "unsupported") return null;

  if (state === "enabled") return <div className="adm-push on">🔔 Push alerts on</div>;

  const label =
    state === "working"
      ? "Enabling…"
      : state === "blocked"
        ? "Blocked — allow in browser"
        : state === "unconfigured"
          ? "Push keys not set"
          : state === "error"
            ? "Retry push setup"
            : "🔔 Enable push alerts";

  return (
    <button className="adm-push" onClick={enable} disabled={state === "working"}>
      {label}
    </button>
  );
}
