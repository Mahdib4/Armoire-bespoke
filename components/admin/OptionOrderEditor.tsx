"use client";
import { useState } from "react";

export type OptionRow = {
  /** Group id, or FABRIC_BLOCK for the automatic Fabric block. */
  id: string;
  name: string;
  /** Shown on the product page. Hidden rows keep their position. */
  on: boolean;
  /** Fabric is built in — it can be moved and hidden, but never removed. */
  fixed?: boolean;
  /** "All collections" or the collection this option belongs to. */
  scope?: string;
  choiceCount?: number;
};

/**
 * The order of the bespoke blocks on a product page (Fabric, Lapel, Cuff
 * Style…), with a Shown/Hidden switch per block.
 *
 * Dragging is armed by the handle so the row moves as a whole. The arrows do
 * the same on touch screens, where HTML5 drag events don't fire.
 */
export default function OptionOrderEditor({
  rows,
  onChange,
}: {
  rows: OptionRow[];
  onChange: (rows: OptionRow[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [armed, setArmed] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return;
    const next = [...rows];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onChange(next);
  };

  const toggle = (i: number) => onChange(rows.map((r, x) => (x === i ? { ...r, on: !r.on } : r)));

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
    setArmed(null);
  };

  if (rows.length === 0) {
    return (
      <p className="adm-empty">
        No options for this collection yet — add them under Bespoke Options.
      </p>
    );
  }

  // Only shown rows are numbered: the numbers match what the customer sees.
  let shownSoFar = 0;

  return (
    <div className="spec-list">
      {rows.map((r, i) => {
        const position = r.on ? ++shownSoFar : null;
        return (
          <div
            key={r.id}
            className={`spec-row opt-row${r.on ? "" : " off"}${dragIndex === i ? " dragging" : ""}${
              overIndex === i && dragIndex !== null && dragIndex !== i ? " over" : ""
            }`}
            draggable={armed === i}
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
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
              aria-label={`Drag to reorder ${r.name}`}
              title="Drag to reorder"
              onMouseDown={() => setArmed(i)}
              onMouseUp={() => setArmed(null)}
              onTouchStart={() => setArmed(i)}
            >
              ⠿
            </span>
            <span className="spec-num">{position ?? "–"}</span>

            <span className="opt-name">
              {r.name}
              {r.fixed && <em className="chip-scope">built in</em>}
              {r.scope && <em className="chip-scope">{r.scope}</em>}
              {r.choiceCount === 0 && !r.fixed && <em className="chip-scope warn">no choices</em>}
            </span>

            <div className="spec-actions">
              <div className="adm-toggle">
                <button type="button" className={r.on ? "on" : ""} onClick={() => r.on || toggle(i)}>
                  Shown
                </button>
                <button type="button" className={!r.on ? "on" : ""} onClick={() => r.on && toggle(i)}>
                  Hidden
                </button>
              </div>
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
                disabled={i === rows.length - 1}
                aria-label="Move down"
                onClick={() => move(i, i + 1)}
              >
                ↓
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
