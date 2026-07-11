"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({
  endpoint,
  label = "Delete",
  confirmMsg = "Delete this item? This cannot be undone.",
  redirect,
}: {
  endpoint: string;
  label?: string;
  confirmMsg?: string;
  redirect?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      if (redirect) router.push(redirect);
      router.refresh();
    } catch {
      alert("Delete failed");
      setBusy(false);
    }
  };

  return (
    <button className="adm-btn sm danger" onClick={run} disabled={busy}>
      {busy ? "…" : label}
    </button>
  );
}
