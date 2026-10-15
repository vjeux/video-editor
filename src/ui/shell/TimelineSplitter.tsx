import * as stylex from "@stylexjs/stylex";
import { useState, type PointerEvent } from "react";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  hit: {
    position: "absolute",
    insetInline: 0,
    top: -5,
    height: 10,
    zIndex: 20,
    display: "grid",
    placeItems: "center",
    cursor: "row-resize",
    touchAction: "none",
  },
  line: {
    position: "absolute",
    insetInline: 0,
    top: 4,
    height: 2,
    backgroundColor: "transparent",
    transition: "background-color 0.15s",
  },
  lineActive: { backgroundColor: colors.accent },
  grip: {
    position: "relative",
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.line2,
    boxShadow: "0 0 0 2px rgba(14, 15, 18, 0.9)",
    transition: "background-color 0.15s, width 0.15s",
  },
  gripActive: { width: 64, backgroundColor: colors.accent2 },
});

/** Drag handle between the editor panels and the timeline; double-click resets. */
export function TimelineSplitter({
  height,
  onResize,
  onReset,
}: {
  height: number;
  onResize: (height: number) => void;
  onReset: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const active = hover || dragging;

  const start = (e: PointerEvent<HTMLDivElement>) => {
    const startY = e.clientY;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    setDragging(true);
    const move = (ev: globalThis.PointerEvent) => onResize(height - (ev.clientY - startY));
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      setDragging(false);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize timeline"
      title="Drag to resize · double-click to reset"
      onPointerDown={start}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onDoubleClick={onReset}
      {...stylex.props(styles.hit)}
    >
      <span {...stylex.props(styles.line, active && styles.lineActive)} />
      <span {...stylex.props(styles.grip, active && styles.gripActive)} />
    </div>
  );
}
