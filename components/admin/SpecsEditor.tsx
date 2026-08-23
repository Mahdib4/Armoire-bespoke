"use client";
import { useState } from "react";

export type Spec = { label: string; value: string };

/**
 * Specification list with drag-to-reorder.
 *
 * The array order IS the display order — it is saved as-is on the product and
 * rendered in the same sequence on the product page — so re-ordering here is
 * all that's needed. Numbers are derived from position, so they re-index
 * themselves the moment a row moves.
 *
 * Dragging is started from the handle only, so text can still be selected
 * inside the inputs. The ↑ / ↓ buttons do the same job for touch screens and
 * keyboards, where HTML5 drag events don't fire.
 */
export default function SpecsEditor({
  specs,
  onChange,
}: {
  specs: Spec[];
  onChange: (specs: Spec[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  // A row is only draggable while the pointer is holding its handle.
  const [armed, setArmed] = useState<number | null>(null);

  const set = (i: number, patch: Partial<Spec>) =>
    onChange(specs.map((s, x) => (x === i ? { ...s, ...patch } : s)));

  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= specs.length || to >= specs.length) return;
    const next = [...specs];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onChange(next);
  };

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
    setArmed(null);
  };

  return (
    <div className="spec-list">
      {specs.length === 0 && (
        <p className="adm-hint">No specifications yet — add the first one below.</p>
      )}

      {specs.map((s, i) => (
        <div
          key={i}
          className={`spec-row${dragIndex === i ? " dragging" : ""}${
            overIndex === i && dragIndex !== null && dragIndex !== i ? " over" : ""
          }`}
          draggable={armed === i}
          onDragStart={(e) => {
            setDragIndex(i);
            e.dataTransfer.effectAllowed = "move";
            // Firefox needs data set for a drag to start at all.
            e.dataTransfer.setData("text/plain", String(i));
          }}
          onDragOver={(e) => {
            if (dragIndex === null) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setOverIndex(i);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null) move(dragIndex, i);
            reset();
          }}
          onDragEnd={reset}
        >
          <span
            className="spec-handle"
            role="button"
            tabIndex={-1}
            aria-label={`Drag to reorder ${s.label || `specification ${i + 1}`}`}
            title="Drag to reorder"
            onMouseDown={() => setArmed(i)}
            onMouseUp={() => setArmed(null)}
            onTouchStart={() => setArmed(i)}
          >
            ⠿
          </span>
          <span className="spec-num">{i + 1}</span>

          <input
            className="spec-label"
            placeholder="Label"
            value={s.label}
            onChange={(e) => set(i, { label: e.target.value })}
          />
          <input
            className="spec-value"
            placeholder="Value"
            value={s.value}
            onChange={(e) => set(i, { value: e.target.value })}
          />

          <div className="spec-actions">
            <button
              className="adm-btn sm"
              type="button"
              disabled={i === 0}
              aria-label="Move up"
              onClick={() => move(i, i - 1)}
            >
              ↑
            </button>
            <button
              className="adm-btn sm"
              type="button"
              disabled={i === specs.length - 1}
              aria-label="Move down"
              onClick={() => move(i, i + 1)}
            >
              ↓
            </button>
            <button
              className="adm-btn sm danger"
              type="button"
              aria-label="Remove specification"
              onClick={() => onChange(specs.filter((_, x) => x !== i))}
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <button
        className="adm-btn sm"
        type="button"
        style={{ marginTop: "0.6rem" }}
        onClick={() => onChange([...specs, { label: "", value: "" }])}
      >
        + Add Spec
      </button>
    </div>
  );
}
