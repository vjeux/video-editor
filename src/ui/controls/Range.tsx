import * as stylex from "@stylexjs/stylex";
import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { colors, motion, shadows } from "../theme/tokens.stylex";
import { fillOrigin, percentOf, snap, valueAt } from "./number-math";

const THUMB = 14;

const styles = stylex.create({
  root: {
    position: "relative",
    flexGrow: 1,
    width: "100%",
    minWidth: 0,
    height: 18,
    cursor: "pointer",
    touchAction: "none",
    outline: "none",
  },
  /** Inset by half a thumb so the thumb never overhangs the control. */
  rail: {
    position: "absolute",
    insetBlock: 0,
    insetInline: THUMB / 2,
  },
  track: {
    position: "absolute",
    left: -THUMB / 2,
    right: -THUMB / 2,
    top: "50%",
    height: 4,
    marginTop: -2,
    borderRadius: 2,
    backgroundColor: {
      default: colors.line2,
      [stylex.when.ancestor(":hover")]: "#3a404d",
    },
    boxShadow: "inset 0 1px 1px rgba(0, 0, 0, 0.3)",
    transitionProperty: "background-color",
    transitionDuration: motion.fast,
  },
  fill: {
    position: "absolute",
    top: "50%",
    height: 4,
    marginTop: -2,
    borderRadius: 2,
    backgroundColor: colors.accent,
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.15)",
  },
  mono: { backgroundColor: colors.muted },
  span: (from: number, to: number) => ({ left: `${from}%`, width: `${to - from}%` }),
  tick: {
    position: "absolute",
    top: "50%",
    width: 2,
    height: 8,
    marginTop: -4,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  at: (pct: number) => ({ left: `${pct}%` }),
  thumb: {
    position: "absolute",
    top: "50%",
    width: THUMB,
    height: THUMB,
    marginTop: -THUMB / 2,
    marginLeft: -THUMB / 2,
    borderRadius: "50%",
    backgroundColor: "#fff",
    backgroundImage: "linear-gradient(180deg, #fff, #e6e7ee)",
    boxShadow: {
      default: shadows.thumb,
      [stylex.when.ancestor(":hover")]: `${shadows.thumb}, 0 0 0 4px ${colors.accentSoft}`,
      [stylex.when.ancestor(":focus-visible")]: `${shadows.thumb}, 0 0 0 4px ${colors.accentRing}`,
    },
    transitionProperty: "box-shadow, transform",
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
  },
  dragging: {
    transform: "scale(1.1)",
    boxShadow: `${shadows.thumb}, 0 0 0 5px ${colors.accentRing}`,
  },
});

const KEY_STEPS: Record<string, (step: number, span: number) => number> = {
  ArrowRight: (step) => step,
  ArrowUp: (step) => step,
  ArrowLeft: (step) => -step,
  ArrowDown: (step) => -step,
  PageUp: (step) => step * 10,
  PageDown: (step) => -step * 10,
  Home: (_, span) => -span,
  End: (_, span) => span,
};

/**
 * Slider with a fill from zero for ranges that straddle it (gain, pan) and,
 * given a `defaultValue`, a tick that marks it and double-click to reset.
 */
export function Range({
  value,
  min,
  max,
  step = 0.01,
  onChange,
  onCommitEnd,
  label,
  tone = "accent",
  defaultValue,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Fires when the user ends a gesture: releases the thumb or the key. */
  onCommitEnd?: () => void;
  label: string;
  tone?: "accent" | "mono";
  defaultValue?: number;
}) {
  const [dragging, setDragging] = useState(false);
  const clamped = Math.min(max, Math.max(min, value));
  const origin = fillOrigin(min, max);
  const from = percentOf(Math.min(origin, clamped), min, max);
  const to = percentOf(Math.max(origin, clamped), min, max);

  const set = (next: number) => {
    if (next !== value) onChange(next);
  };
  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rail = e.currentTarget.firstElementChild?.getBoundingClientRect();
    if (rail) set(valueAt(e.clientX, rail, min, max, step));
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.focus();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        fromPointer(e);
      }}
      onPointerMove={(e) => dragging && fromPointer(e)}
      onPointerUp={() => {
        if (!dragging) return;
        setDragging(false);
        onCommitEnd?.();
      }}
      onDoubleClick={() => {
        if (defaultValue === undefined) return;
        set(defaultValue);
        onCommitEnd?.();
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        const delta = KEY_STEPS[e.key];
        if (!delta) return;
        e.preventDefault();
        e.stopPropagation();
        const scale = e.shiftKey ? 10 : 1;
        const next = snap(clamped + delta(step, max - min) * scale, step, min);
        set(Math.min(max, Math.max(min, next)));
      }}
      onKeyUp={(e) => KEY_STEPS[e.key] && onCommitEnd?.()}
      {...stylex.props(styles.root, stylex.defaultMarker())}
    >
      <div {...stylex.props(styles.rail)}>
        <div {...stylex.props(styles.track)} />
        <div
          {...stylex.props(styles.fill, tone === "mono" && styles.mono, styles.span(from, to))}
        />
        {defaultValue !== undefined && defaultValue > min && defaultValue < max && (
          <div {...stylex.props(styles.tick, styles.at(percentOf(defaultValue, min, max)))} />
        )}
        <div
          {...stylex.props(
            styles.thumb,
            styles.at(percentOf(clamped, min, max)),
            dragging && styles.dragging,
          )}
        />
      </div>
    </div>
  );
}
