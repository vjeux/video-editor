import * as stylex from "@stylexjs/stylex";
import { useRef, useState, type PointerEvent } from "react";
import { colors, fonts } from "../theme/tokens.stylex";
import { scrubbed } from "./number-math";
import { surfaces } from "./surfaces";

/** Pointer travel before a press turns into a scrub instead of a click to type. */
const SCRUB_THRESHOLD = 3;

const styles = stylex.create({
  box: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    paddingBlock: 0,
    paddingInline: 7,
    gap: 1,
  },
  input: {
    flexGrow: 1,
    width: "100%",
    minWidth: 0,
    height: "100%",
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    fontFamily: fonts.mono,
    fontSize: 11,
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
    outline: "none",
    color: colors.text,
    userSelect: "text",
    cursor: { default: "ew-resize", ":focus": "text" },
  },
  bareBox: { display: "flex", alignItems: "center", flexGrow: 1, minWidth: 0 },
  bareInput: { textAlign: "start" },
  scrubbing: { color: colors.accent2 },
  suffix: {
    flexShrink: 0,
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.faint,
    pointerEvents: "none",
  },
});

/**
 * Numeric input: drag horizontally to scrub (shift ×10, alt ×0.1), click to
 * type, Enter or blur to commit, arrow keys to nudge. `onCommitEnd` marks
 * the end of a gesture so a whole scrub is one undo step.
 */
export function NumberField({
  value,
  onChange,
  onCommitEnd,
  min = -Infinity,
  max = Infinity,
  step = 1,
  precision = 0,
  suffix = "",
  label,
  bare,
}: {
  value: number;
  onChange: (value: number) => void;
  onCommitEnd?: () => void;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  suffix?: string;
  label: string;
  /** Without its own well, for use inside a labelled Field. */
  bare?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const press = useRef<{ x: number; value: number; moved: boolean } | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = (text: string) => {
    setDraft(null);
    const parsed = Number.parseFloat(text);
    if (Number.isFinite(parsed) && parsed !== value) onChange(clamp(parsed));
    onCommitEnd?.();
  };

  const onPointerDown = (e: PointerEvent<HTMLInputElement>) => {
    if (e.button !== 0 || document.activeElement === e.currentTarget) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { x: e.clientX, value, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLInputElement>) => {
    const start = press.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    if (!start.moved && Math.abs(dx) < SCRUB_THRESHOLD) return;
    if (!start.moved) setScrubbing(true);
    start.moved = true;
    const next = scrubbed(
      start.value,
      dx,
      step,
      { coarse: e.shiftKey, fine: e.altKey },
      { min, max },
    );
    if (next !== value) onChange(next);
  };
  const onPointerUp = (e: PointerEvent<HTMLInputElement>) => {
    const start = press.current;
    press.current = null;
    if (!start) return;
    if (start.moved) {
      setScrubbing(false);
      onCommitEnd?.();
    } else {
      e.currentTarget.focus();
    }
  };

  // Inside a Field the surrounding label already owns the well.
  const Box = bare ? "span" : "label";
  return (
    <Box {...stylex.props(bare ? styles.bareBox : [surfaces.well, styles.box])}>
      <input
        aria-label={label}
        inputMode="decimal"
        value={draft ?? value.toFixed(precision)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onFocus={(e) => {
          setDraft(value.toFixed(precision));
          const input = e.currentTarget;
          requestAnimationFrame(() => input.select());
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value.toFixed(precision));
            e.currentTarget.blur();
          }
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const next = clamp(
              value + (e.key === "ArrowUp" ? step : -step) * (e.shiftKey ? 10 : 1),
            );
            onChange(next);
            onCommitEnd?.();
            setDraft(next.toFixed(precision));
          }
        }}
        {...stylex.props(styles.input, bare && styles.bareInput, scrubbing && styles.scrubbing)}
      />
      {suffix && (
        <span aria-hidden {...stylex.props(styles.suffix)}>
          {suffix}
        </span>
      )}
    </Box>
  );
}
