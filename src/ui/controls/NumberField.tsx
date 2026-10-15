import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { colors, fonts, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  input: {
    width: "100%",
    minWidth: 0,
    height: 24,
    paddingBlock: 0,
    paddingInline: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, ":focus": colors.accent },
    backgroundColor: colors.bg,
    fontFamily: fonts.mono,
    fontSize: 11,
    textAlign: "center",
    outline: "none",
    userSelect: "text",
  },
  bare: {
    height: "auto",
    borderWidth: 0,
    backgroundColor: "transparent",
    textAlign: "start",
    padding: 0,
  },
});

/** Numeric input that commits on Enter or blur and nudges with the arrow keys. */
export function NumberField({
  value,
  onChange,
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
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  suffix?: string;
  label: string;
  /** Borderless, for use inside a labelled Field. */
  bare?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = (text: string) => {
    setDraft(null);
    const parsed = Number.parseFloat(text);
    if (Number.isFinite(parsed)) onChange(clamp(parsed));
  };
  return (
    <input
      aria-label={label}
      value={draft ?? `${value.toFixed(precision)}${suffix}`}
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
          setDraft(null);
          e.currentTarget.blur();
        }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const next = clamp(value + (e.key === "ArrowUp" ? step : -step) * (e.shiftKey ? 10 : 1));
          onChange(next);
          setDraft(next.toFixed(precision));
        }
      }}
      {...stylex.props(styles.input, bare && styles.bare)}
    />
  );
}
