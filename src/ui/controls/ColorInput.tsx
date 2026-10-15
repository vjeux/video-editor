import * as stylex from "@stylexjs/stylex";
import { colors, fonts, motion, radii, shadows, sizes } from "../theme/tokens.stylex";
import { surfaces } from "./surfaces";

const CHECKER =
  "conic-gradient(#8a8f9c 25%, #c9ccd4 0 50%, #8a8f9c 0 75%, #c9ccd4 0) 0 0 / 8px 8px";

const styles = stylex.create({
  swatch: {
    position: "relative",
    flexShrink: 0,
    width: 30,
    height: sizes.controlSm,
    borderRadius: radii.md,
    overflow: "hidden",
    background: CHECKER,
    boxShadow: {
      default: `inset 0 0 0 1px rgba(255, 255, 255, 0.12), ${shadows.raised}`,
      ":hover": `inset 0 0 0 1px rgba(255, 255, 255, 0.25), ${shadows.raised}`,
      ":focus-within": `inset 0 0 0 1px rgba(255, 255, 255, 0.25), ${shadows.ring}`,
    },
    cursor: "pointer",
    transitionProperty: "box-shadow",
    transitionDuration: motion.fast,
  },
  fill: {
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.12)",
  },
  paint: (color: string) => ({ backgroundColor: color }),
  input: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    paddingInlineStart: 3,
    paddingInlineEnd: 8,
    cursor: "pointer",
  },
  rowSwatch: { width: 22, height: 20, borderRadius: 5 },
  hex: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
  },
});

/** The native picker only takes #rrggbb; rgb()/rgba() values open at their opaque colour. */
function toHex(value: string): string {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(value);
  if (!rgb) return "#000000";
  return `#${rgb
    .slice(1, 4)
    .map((c) => Number(c).toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Colour swatch over a transparency checkerboard that opens the system
 * picker. `showValue` renders it as a full-width field with the hex code.
 */
export function ColorInput({
  label,
  value,
  onChange,
  showValue,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showValue?: boolean;
}) {
  const swatch = (
    <span {...stylex.props(styles.swatch, showValue && styles.rowSwatch)}>
      <span {...stylex.props(styles.fill, styles.paint(value))} />
      <input
        type="color"
        aria-label={label}
        value={toHex(value)}
        onChange={(e) => onChange(e.target.value)}
        {...stylex.props(styles.input)}
      />
    </span>
  );
  if (!showValue) return swatch;
  return (
    <label {...stylex.props(surfaces.well, styles.row)}>
      {swatch}
      <span {...stylex.props(styles.hex)}>{toHex(value)}</span>
    </label>
  );
}
