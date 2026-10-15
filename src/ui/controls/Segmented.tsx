import * as stylex from "@stylexjs/stylex";
import type { KeyboardEvent, ReactNode } from "react";
import { colors, motion, radii, shadows, sizes } from "../theme/tokens.stylex";
import { stepEnabled } from "./roving";

const INSET = 2;

const styles = stylex.create({
  group: {
    position: "relative",
    display: "flex",
    height: sizes.control,
    padding: INSET,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: colors.field,
    boxShadow: shadows.well,
  },
  thumb: {
    position: "absolute",
    top: INSET,
    bottom: INSET,
    left: INSET,
    borderRadius: 4,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.accentRing,
    boxShadow: shadows.raised,
    pointerEvents: "none",
    transitionProperty: "transform",
    transitionDuration: motion.base,
    transitionTimingFunction: motion.spring,
  },
  /** Equal-width options let the thumb move by whole multiples of its own width. */
  slot: (count: number, index: number) => ({
    width: `calc((100% - ${INSET * 2}px) / ${count})`,
    transform: `translateX(${index * 100}%)`,
  }),
  option: {
    position: "relative",
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    padding: 0,
    borderWidth: 0,
    borderRadius: 5,
    display: "grid",
    placeItems: "center",
    fontSize: 11.5,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    color: {
      default: colors.muted,
      ":hover:not(:disabled)": colors.text,
      ":disabled": colors.faint,
    },
    backgroundColor: "transparent",
    transitionProperty: "color",
    transitionDuration: motion.fast,
  },
  compact: { fontSize: 10.5, paddingInline: 2 },
  on: {
    color: { default: colors.accent2, ":hover:not(:disabled)": colors.accent2 },
    fontWeight: 600,
  },
});

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  compact,
}: {
  value: T;
  options: readonly { value: T; label: ReactNode; title?: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  label: string;
  /** Tighter options for long rows such as speed presets. */
  compact?: boolean;
}) {
  const selected = options.findIndex((o) => o.value === value);
  const enabled = options.map((o) => !o.disabled);
  // Roving tab stop: the selected option, or the first one that can be chosen.
  const tabStop = selected >= 0 ? selected : stepEnabled(enabled, -1, 1);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (delta !== 1 && delta !== -1) return;
    e.preventDefault();
    e.stopPropagation();
    const next = stepEnabled(enabled, selected, delta);
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    e.currentTarget.querySelectorAll<HTMLElement>("[role=radio]")[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} {...stylex.props(styles.group)}>
      {selected >= 0 && (
        <span aria-hidden {...stylex.props(styles.thumb, styles.slot(options.length, selected))} />
      )}
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={i === selected}
          tabIndex={i === tabStop ? 0 : -1}
          title={o.title}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          {...stylex.props(styles.option, compact && styles.compact, i === selected && styles.on)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
