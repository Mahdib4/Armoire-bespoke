"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";

type Media = { id: string; url: string; type: string };

export default function MediaManager({ media }: { media: Media[] }) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (url: string) => {
    navigator.clipboard?.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  };
  const del = async (id: string) => {
    if (!confirm("Remove from library? (file stays on disk)")) return;
    await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div>
      <div className="adm-panel">
        <h3>Upload</h3>
        <div className="adm-actions">
          <Uploader accept="image/*" label="+ Image" onUploaded={() => router.refresh()} />
          <Uploader accept="video/*" label="+ Video" onUploaded={() => router.refresh()} />
          <span className="adm-msg" style={{ color: "var(--text-muted)" }}>Uploads are added to the library and can be referenced anywhere.</span>
        </div>
      </div>

      <div className="adm-panel">
        <h3>Library ({media.length})</h3>
        {media.length === 0 ? (
          <p className="adm-empty">Nothing uploaded yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.8rem" }}>
            {media.map((m) => (
              <div key={m.id} style={{ border: "1px solid var(--border)", background: "#0d0d0d" }}>
                <div style={{ aspectRatio: "1 / 1", background: "#151515", overflow: "hidden" }}>
                  {m.type === "video" ? (
                    <video src={m.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <div style={{ padding: "0.4rem", display: "flex", gap: "0.3rem", justifyContent: "space-between" }}>
                  <button className="adm-btn sm" onClick={() => copy(m.url)}>{copied === m.url ? "Copied" : "Copy URL"}</button>
                  <button className="adm-btn sm danger" onClick={() => del(m.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
