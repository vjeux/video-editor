import * as stylex from "@stylexjs/stylex";
import { colors } from "../theme/tokens.stylex";

const thumb = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  borderWidth: 0,
  backgroundColor: "#fff",
  boxShadow: "0 1px 4px rgba(0, 0, 0, 0.5)",
} as const;

const styles = stylex.create({
  input: {
    appearance: "none",
    height: 16,
    minWidth: 0,
    margin: 0,
    backgroundColor: "transparent",
    cursor: "pointer",
    "::-webkit-slider-runnable-track": {
      height: 4,
      borderRadius: 2,
      backgroundImage: `linear-gradient(90deg, var(--fill) var(--pct), ${colors.line2} var(--pct))`,
    },
    "::-webkit-slider-thumb": { ...thumb, appearance: "none", marginTop: -4 },
    "::-moz-range-track": { height: 4, borderRadius: 2, backgroundColor: colors.line2 },
    "::-moz-range-thumb": { ...thumb },
  },
  fill: (pct: string, fill: string) => ({ "--pct": pct, "--fill": fill }),
});

export function Range({
  value,
  min,
  max,
  step = 0.01,
  onChange,
  onCommitEnd,
  label,
  tone = "accent",
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Fires when the user releases the slider, ending the gesture. */
  onCommitEnd?: () => void;
  label: string;
  tone?: "accent" | "mono";
}) {
  const pct = `${((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100}%`;
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      onPointerUp={onCommitEnd}
      onKeyUp={onCommitEnd}
      {...stylex.props(
        styles.input,
        styles.fill(pct, tone === "accent" ? colors.accent : colors.text),
      )}
    />
  );
}
