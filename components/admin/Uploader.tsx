"use client";
import { useRef, useState } from "react";

export default function Uploader({
  accept = "image/*",
  label = "Upload",
  onUploaded,
}: {
  accept?: string;
  label?: string;
  onUploaded: (url: string, type: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      onUploaded(data.url, data.type);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <button type="button" className="adm-btn sm" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? "Uploading…" : label}
      </button>
      <input ref={ref} type="file" accept={accept} hidden onChange={handle} />
    </>
  );
}
