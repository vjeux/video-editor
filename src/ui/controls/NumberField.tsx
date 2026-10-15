import * as stylex from "@stylexjs/stylex";
import { useRef, useState, type PointerEvent } from "react";
import { colors, fonts } from "../theme/tokens.stylex";
import { scrubbed } from "./number-math";
import { surfaces } from "./surfaces";
import { Icon } from "./Icon";

/** Pointer travel before a press turns into a scrub instead of a click to type. */
const SCRUB_THRESHOLD = 3;

const styles = stylex.create({
  box: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    paddingBlock: 0,
    paddingInlineStart: 7,
    paddingInlineEnd: 2,
    gap: 3,
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
    touchAction: "none",
  },
  bareBox: { display: "flex", alignItems: "center", flexGrow: 1, minWidth: 0 },
  bareInput: { textAlign: "start" },
  scrubbing: { color: colors.accent2 },
  active: { borderColor: colors.accent },
  suffix: {
    flexShrink: 0,
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.faint,
    pointerEvents: "none",
  },
  steps: {
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    width: 14,
    height: 24,
    marginLeft: 1,
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    borderLeftColor: colors.line,
  },
  step: {
    display: "grid",
    placeItems: "center",
    flexGrow: 1,
    minHeight: 0,
    padding: 0,
    borderWidth: 0,
    borderRadius: 2,
    color: { default: colors.faint, ":hover:not(:disabled)": colors.text },
    backgroundColor: { default: "transparent", ":hover:not(:disabled)": colors.raisedHover },
    opacity: { default: 1, ":disabled": 0.3 },
    cursor: { default: "pointer", ":disabled": "default" },
  },
  up: { transform: "rotate(180deg)" },
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
  const cancelEdit = useRef(false);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = (text: string) => {
    setDraft(null);
    const parsed = Number.parseFloat(text);
    if (Number.isFinite(parsed) && parsed !== value) onChange(clamp(parsed));
    onCommitEnd?.();
  };
  const nudge = (direction: number, coarse = false) => {
    const parsed = draft === null ? value : Number.parseFloat(draft);
    const next = clamp(
      (Number.isFinite(parsed) ? parsed : value) + direction * step * (coarse ? 10 : 1),
    );
    const rounded = clamp(Number(next.toFixed(precision)));
    if (rounded !== value) onChange(rounded);
    onCommitEnd?.();
    if (draft !== null) setDraft(rounded.toFixed(precision));
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
  const Box = bare ? "span" : "div";
  return (
    <Box
      {...stylex.props(
        bare ? styles.bareBox : [surfaces.well, styles.box, scrubbing && styles.active],
      )}
    >
      <input
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={Number.isFinite(min) ? min : undefined}
        aria-valuemax={Number.isFinite(max) ? max : undefined}
        aria-valuetext={`${value.toFixed(precision)}${suffix}`}
        title="Drag to adjust · Shift for larger steps · Alt for finer steps"
        inputMode="decimal"
        value={draft ?? value.toFixed(precision)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          if (press.current?.moved) onCommitEnd?.();
          press.current = null;
          setScrubbing(false);
        }}
        onFocus={(e) => {
          setDraft(value.toFixed(precision));
          const input = e.currentTarget;
          requestAnimationFrame(() => document.activeElement === input && input.select());
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => {
          if (cancelEdit.current) {
            cancelEdit.current = false;
            setDraft(null);
          } else commit(e.target.value);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            cancelEdit.current = true;
            e.currentTarget.blur();
          }
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            nudge(e.key === "ArrowUp" ? 1 : -1, e.shiftKey);
          }
        }}
        {...stylex.props(styles.input, bare && styles.bareInput, scrubbing && styles.scrubbing)}
      />
      {suffix && (
        <span aria-hidden {...stylex.props(styles.suffix)}>
          {suffix}
        </span>
      )}
      {!bare && (
        <span {...stylex.props(styles.steps)}>
          {([1, -1] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              aria-label={`${direction === 1 ? "Increase" : "Decrease"} ${label}`}
              disabled={direction === 1 ? value >= max : value <= min}
              onPointerDown={(e) => e.preventDefault()}
              onClick={(e) => nudge(direction, e.shiftKey)}
              onKeyDown={(e) => e.stopPropagation()}
              {...stylex.props(styles.step)}
            >
              <span {...stylex.props(direction === 1 && styles.up)}>
                <Icon name="chevronDown" size={9} />
              </span>
            </button>
          ))}
        </span>
      )}
    </Box>
  );
}
