import * as stylex from "@stylexjs/stylex";
import { useRef, useState } from "react";
import type { MaskPoint } from "../../core/types";
import { Button } from "../controls/Button";
import { SliderRow } from "../controls/SliderRow";
import { useGestureKey } from "../gesture";
import { colors } from "../theme/tokens.stylex";
import { AppearanceHint } from "./AppearanceHint";
import { PERCENT } from "./options";

const styles = stylex.create({
  editor: {
    position: "relative",
    width: "calc(100% - 24px)",
    maxWidth: 240,
    margin: 12,
    borderRadius: 6,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
  },
  ratio: (ratio: number) => ({ aspectRatio: ratio, maxWidth: Math.min(240, 180 * ratio) }),
  shape: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    overflow: "visible",
    fill: colors.accentSoft,
    stroke: colors.accent,
    strokeWidth: 1,
    pointerEvents: "none",
  },
  point: {
    position: "absolute",
    width: 22,
    height: 22,
    padding: 0,
    borderRadius: "50%",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.accent,
    backgroundColor: colors.panel,
    color: colors.text,
    fontSize: 10,
    transform: "translate(-50%, -50%)",
    touchAction: "none",
    cursor: "move",
  },
  selected: { backgroundColor: colors.accent, color: colors.onAccent },
  position: (x: number, y: number) => ({ left: `${x * 100}%`, top: `${y * 100}%` }),
  actions: { display: "flex", gap: 8, marginBottom: 10 },
});
const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** A polygon editor with the same pointer and keyboard paths; no SVG/path code required. */
export function MaskEditor({
  points,
  ratio,
  onChange,
}: {
  points: readonly MaskPoint[];
  ratio: number;
  onChange: (points: readonly MaskPoint[], key?: string) => void;
}) {
  const [active, setActive] = useState(0);
  const selected = Math.min(active, points.length - 1);
  const board = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);
  const gesture = useGestureKey("mask-point");
  const point = points[selected]!;
  const setPoint = (index: number, value: MaskPoint, key?: string) =>
    onChange(
      points.map((p, i) => (i === index ? { x: clamp(value.x), y: clamp(value.y) } : p)),
      key,
    );
  return (
    <>
      <div ref={board} {...stylex.props(styles.editor, styles.ratio(ratio))}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
          {...stylex.props(styles.shape)}
        >
          <polygon
            points={points.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {points.map((p, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Mask point ${i + 1}`}
            aria-pressed={i === selected}
            {...stylex.props(
              styles.point,
              styles.position(p.x, p.y),
              i === selected && styles.selected,
            )}
            onClick={() => setActive(i)}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              setActive(i);
              drag.current = i;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const rect = board.current?.getBoundingClientRect();
              if (drag.current !== i || !rect) return;
              setPoint(
                i,
                {
                  x: (e.clientX - rect.left) / rect.width,
                  y: (e.clientY - rect.top) / rect.height,
                },
                gesture.key,
              );
            }}
            onPointerUp={() => {
              drag.current = null;
              gesture.renew();
            }}
            onPointerCancel={() => {
              drag.current = null;
              gesture.renew();
            }}
            onKeyDown={(e) => {
              if (e.metaKey || e.ctrlKey) return;
              const step = e.shiftKey ? 0.1 : 0.01;
              const delta = (
                {
                  ArrowLeft: [-step, 0],
                  ArrowRight: [step, 0],
                  ArrowUp: [0, -step],
                  ArrowDown: [0, step],
                } as Record<string, number[]>
              )[e.key];
              if (delta) {
                e.stopPropagation();
                e.preventDefault();
                setPoint(i, { x: p.x + delta[0]!, y: p.y + delta[1]! }, gesture.key);
              }
            }}
            onKeyUp={gesture.renew}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <AppearanceHint>Drag a point or use arrow keys. Shift moves in larger steps.</AppearanceHint>
      <SliderRow
        label={`Point ${selected + 1} X`}
        value={point.x}
        min={0}
        max={1}
        {...PERCENT}
        onChange={(x, key) => setPoint(selected, { ...point, x }, key)}
      />
      <SliderRow
        label={`Point ${selected + 1} Y`}
        value={point.y}
        min={0}
        max={1}
        {...PERCENT}
        onChange={(y, key) => setPoint(selected, { ...point, y }, key)}
      />
      <div {...stylex.props(styles.actions)}>
        <Button
          disabled={points.length >= 32}
          onClick={() => {
            const next = points[(selected + 1) % points.length]!;
            onChange([
              ...points.slice(0, selected + 1),
              { x: (point.x + next.x) / 2, y: (point.y + next.y) / 2 },
              ...points.slice(selected + 1),
            ]);
            setActive(selected + 1);
          }}
        >
          Add point
        </Button>
        <Button
          disabled={points.length <= 3}
          onClick={() => {
            onChange(points.filter((_, i) => i !== selected));
            setActive(Math.max(0, selected - 1));
          }}
        >
          Remove point
        </Button>
      </div>
    </>
  );
}
