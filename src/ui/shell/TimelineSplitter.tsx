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
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.line2,
    boxShadow: `0 0 0 2px ${colors.panel}`,
    transition: "background-color 0.15s, width 0.15s",
  },
  gripActive: { width: 64, backgroundColor: colors.accent2 },
});

/** Drag handle between the editor panels and the timeline; double-click resets. */
export function TimelineSplitter({
  height,
  minHeight,
  maxHeight,
  onResize,
  onReset,
}: {
  height: number;
  minHeight: number;
  maxHeight: number;
  onResize: (height: number) => void;
  onReset: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const active = hover || dragging;

  const start = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startY = e.clientY;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    setDragging(true);
    const move = (ev: globalThis.PointerEvent) => onResize(height - (ev.clientY - startY));
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
      setDragging(false);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize timeline"
      aria-controls="timeline-panel"
      aria-valuenow={height}
      aria-valuemin={minHeight}
      aria-valuemax={maxHeight}
      aria-valuetext={`${height} pixels high`}
      tabIndex={0}
      title="Drag or use arrow keys to resize · double-click or Enter to reset"
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          onResize(height + (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 40 : 10));
        } else if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          onReset();
        }
      }}
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
