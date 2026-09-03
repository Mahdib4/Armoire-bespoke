"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Uploader from "./Uploader";
import Marquee from "../Marquee";
import {
  MARQUEE_SECTION_KEY,
  serializeMarquee,
  type MarqueeConfig,
} from "@/lib/marquee";

/**
 * The announcement strip. Everything about it — text or images, typeface,
 * colours, size, speed and spacing — is set here, with a live preview of the
 * real component above the controls.
 */
export default function MarqueeEditor({ config }: { config: MarqueeConfig }) {
  const router = useRouter();
  const [f, setF] = useState<MarqueeConfig>(config);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const upd = <K extends keyof MarqueeConfig>(k: K, v: MarqueeConfig[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/sections/${MARQUEE_SECTION_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: serializeMarquee(f) }),
      });
      if (!res.ok) throw new Error();
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Save failed." });
    } finally {
      setBusy(false);
    }
  };

  const setItem = (i: number, value: string) => {
    const items = [...f.items];
    items[i] = value;
    upd("items", items);
  };

  const setImage = (i: number, patch: Partial<MarqueeConfig["images"][number]>) => {
    const images = [...f.images];
    images[i] = { ...images[i], ...patch };
    upd("images", images);
  };

  return (
    <div className="adm-form">
      {/* Live preview — the very component the homepage renders. */}
      <div className="adm-panel">
        <h3>Preview</h3>
        <div className="adm-mq-preview">
          <Marquee config={{ ...f, show: true }} />
        </div>
        {!f.show && (
          <p className="adm-hint" style={{ marginBottom: 0 }}>
            The strip is currently hidden on the site — switch it to Shown below when you&rsquo;re happy.
          </p>
        )}
      </div>

      <div className="adm-panel">
        <h3>Strip</h3>
        <div className="adm-form-grid">
          <div className="adm-field">
            <label>Visibility</label>
            <div className="adm-toggle">
              <button type="button" className={f.show ? "on" : ""} onClick={() => upd("show", true)}>Shown</button>
              <button type="button" className={!f.show ? "on" : ""} onClick={() => upd("show", false)}>Hidden</button>
            </div>
          </div>
          <div className="adm-field">
            <label>Content</label>
            <div className="adm-toggle">
              <button type="button" className={f.mode === "text" ? "on" : ""} onClick={() => upd("mode", "text")}>Text</button>
              <button type="button" className={f.mode === "images" ? "on" : ""} onClick={() => upd("mode", "images")}>Images</button>
            </div>
          </div>
          <div className="adm-field">
            <label>Direction</label>
            <div className="adm-toggle">
              <button type="button" className={f.direction === "left" ? "on" : ""} onClick={() => upd("direction", "left")}>← Left</button>
              <button type="button" className={f.direction === "right" ? "on" : ""} onClick={() => upd("direction", "right")}>Right →</button>
            </div>
          </div>
          <div className="adm-field">
            <label>Speed — {f.speed}s per pass</label>
            <input type="range" min={6} max={90} value={f.speed} onChange={(e) => upd("speed", Number(e.target.value))} />
            <span className="adm-hint">Higher is slower and calmer.</span>
          </div>
          <div className="adm-field">
            <label>Spacing — {f.gap}px</label>
            <input type="range" min={8} max={200} value={f.gap} onChange={(e) => upd("gap", Number(e.target.value))} />
          </div>
          <div className="adm-field">
            <label>Height padding — {f.paddingY}px</label>
            <input type="range" min={0} max={40} value={f.paddingY} onChange={(e) => upd("paddingY", Number(e.target.value))} />
          </div>
          <div className="adm-field">
            <label>Pause on Hover</label>
            <div className="adm-toggle">
              <button type="button" className={f.pauseOnHover ? "on" : ""} onClick={() => upd("pauseOnHover", true)}>Yes</button>
              <button type="button" className={!f.pauseOnHover ? "on" : ""} onClick={() => upd("pauseOnHover", false)}>No</button>
            </div>
          </div>
          <div className="adm-field">
            <label>Background</label>
            <div className="adm-color">
              <input type="color" value={f.background} onChange={(e) => upd("background", e.target.value)} />
              <input value={f.background} onChange={(e) => upd("background", e.target.value)} />
            </div>
          </div>
          <div className="adm-field">
            <label>Border</label>
            <div className="adm-color">
              <input type="color" value={f.borderColor} onChange={(e) => upd("borderColor", e.target.value)} />
              <input value={f.borderColor} onChange={(e) => upd("borderColor", e.target.value)} />
            </div>
          </div>
          <div className="adm-field wide">
            <label>Link (optional)</label>
            <input
              value={f.href}
              placeholder="/campaign/eid-2026"
              onChange={(e) => upd("href", e.target.value)}
            />
            <span className="adm-hint">Makes the whole strip clickable — handy during a campaign.</span>
          </div>
        </div>
      </div>

      {f.mode === "text" ? (
        <div className="adm-panel">
          <h3>Messages</h3>
          <p className="adm-hint">
            Each message appears in turn and the strip repeats. Keep them short — this is a headline
            band, not a paragraph.
          </p>
          {f.items.map((it, i) => (
            <div className="adm-sub-row" key={i}>
              <input value={it} onChange={(e) => setItem(i, e.target.value)} aria-label={`Message ${i + 1}`} />
              <button
                className="adm-btn sm danger"
                type="button"
                onClick={() => upd("items", f.items.filter((_, x) => x !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <button className="adm-btn sm" type="button" onClick={() => upd("items", [...f.items, ""])}>
            + Add Message
          </button>

          <div className="adm-form-grid" style={{ marginTop: "1.2rem" }}>
            <div className="adm-field">
              <label>Typeface</label>
              <select value={f.font} onChange={(e) => upd("font", e.target.value as MarqueeConfig["font"])}>
                <option value="sans">Montserrat (clean)</option>
                <option value="display">Cinzel (the logo face)</option>
                <option value="serif">Cormorant (elegant)</option>
              </select>
            </div>
            <div className="adm-field">
              <label>Text Size — {f.fontSize}px</label>
              <input type="range" min={9} max={40} value={f.fontSize} onChange={(e) => upd("fontSize", Number(e.target.value))} />
            </div>
            <div className="adm-field">
              <label>Weight</label>
              <select value={f.weight} onChange={(e) => upd("weight", Number(e.target.value))}>
                <option value={300}>Light</option>
                <option value={400}>Regular</option>
                <option value={500}>Medium</option>
                <option value={600}>Semi Bold</option>
                <option value={700}>Bold</option>
              </select>
            </div>
            <div className="adm-field">
              <label>Letter Spacing — {f.letterSpacing}px</label>
              <input type="range" min={0} max={10} value={f.letterSpacing} onChange={(e) => upd("letterSpacing", Number(e.target.value))} />
            </div>
            <div className="adm-field">
              <label>Capitals</label>
              <div className="adm-toggle">
                <button type="button" className={f.uppercase ? "on" : ""} onClick={() => upd("uppercase", true)}>UPPERCASE</button>
                <button type="button" className={!f.uppercase ? "on" : ""} onClick={() => upd("uppercase", false)}>Normal</button>
              </div>
            </div>
            <div className="adm-field">
              <label>Italic</label>
              <div className="adm-toggle">
                <button type="button" className={f.italic ? "on" : ""} onClick={() => upd("italic", true)}>Italic</button>
                <button type="button" className={!f.italic ? "on" : ""} onClick={() => upd("italic", false)}>Upright</button>
              </div>
            </div>
            <div className="adm-field">
              <label>Text Colour</label>
              <div className="adm-color">
                <input type="color" value={f.color} onChange={(e) => upd("color", e.target.value)} />
                <input value={f.color} onChange={(e) => upd("color", e.target.value)} />
              </div>
            </div>
            <div className="adm-field">
              <label>Separator</label>
              <input value={f.separator} maxLength={4} onChange={(e) => upd("separator", e.target.value)} />
              <span className="adm-hint">Drawn between messages, e.g. ◆ · — ✦. Blank for none.</span>
            </div>
            <div className="adm-field">
              <label>Separator Colour</label>
              <div className="adm-color">
                <input type="color" value={f.separatorColor} onChange={(e) => upd("separatorColor", e.target.value)} />
                <input value={f.separatorColor} onChange={(e) => upd("separatorColor", e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="adm-panel">
          <h3>Images</h3>
          <p className="adm-hint">
            They loop with even spacing between them. Logos and small badges work best — the strip is
            deliberately slim.
          </p>
          <div className="adm-field" style={{ maxWidth: 320 }}>
            <label>Image Height — {f.imageHeight}px</label>
            <input type="range" min={16} max={90} value={f.imageHeight} onChange={(e) => upd("imageHeight", Number(e.target.value))} />
          </div>

          {f.images.map((im, i) => (
            <div className="adm-mq-img" key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" />
              <div className="adm-field" style={{ flex: 1 }}>
                <label>Image URL</label>
                <input value={im.url} onChange={(e) => setImage(i, { url: e.target.value })} />
              </div>
              <div className="adm-field" style={{ flex: 1 }}>
                <label>Link (optional)</label>
                <input value={im.href} onChange={(e) => setImage(i, { href: e.target.value })} />
              </div>
              <button
                className="adm-btn sm danger"
                type="button"
                onClick={() => upd("images", f.images.filter((_, x) => x !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="adm-actions">
            <Uploader
              accept="image/*"
              label="+ Upload Image"
              onUploaded={(url) => upd("images", [...f.images, { url, href: "", alt: "" }])}
            />
          </div>
        </div>
      )}

      <div className="adm-actions adm-sticky-save">
        <button className="adm-btn solid" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save Marquee"}
        </button>
        {msg && <span className={`adm-msg ${msg.ok ? "" : "err"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
