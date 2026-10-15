import * as stylex from "@stylexjs/stylex";

export const colors = stylex.defineVars({
  bg: "#0e0f12",
  panel: "#16181d",
  panel2: "#1c1f26",
  panel3: "#232731",
  stage: "#0b0c0f",
  lanes: "#121419",
  line: "#262a33",
  line2: "#323743",
  text: "#e6e8ee",
  muted: "#8b91a1",
  faint: "#5b6170",
  accent: "#7c6cff",
  accentHover: "#6b5af5",
  accent2: "#a99dff",
  accentSoft: "rgba(124, 108, 255, 0.12)",
  accentRing: "rgba(124, 108, 255, 0.35)",
  pink: "#ff6cb5",
  video: "#3d6df2",
  video2: "#2a4fb8",
  title: "#c06cf2",
  audio: "#23b38a",
  audioDeep: "#165c49",
  music: "#e3a63b",
  danger: "#ff5d6c",
  dangerSoft: "rgba(255, 93, 108, 0.14)",
  /** Recessed input wells (text, number, select triggers). */
  field: "#101216",
  fieldHover: "#13151a",
  /** Raised surfaces: buttons, the segmented thumb, menu panels. */
  raised: "#252935",
  raisedHover: "#2b303d",
  popover: "rgba(30, 33, 41, 0.97)",
  highlight: "rgba(255, 255, 255, 0.06)",
});

export const fonts = stylex.defineVars({
  sans: '"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, monospace',
});

export const radii = stylex.defineVars({
  sm: "4px",
  md: "7px",
  lg: "8px",
  xl: "12px",
  pill: "99px",
});

/** One height per control size so rows of mixed controls line up. */
export const sizes = stylex.defineVars({
  control: "28px",
  controlSm: "24px",
});

export const shadows = stylex.defineVars({
  frame: "0 20px 60px rgba(0, 0, 0, 0.5)",
  pop: "0 12px 30px rgba(0, 0, 0, 0.4)",
  dialog: "0 30px 80px rgba(0, 0, 0, 0.6)",
  focus: "0 0 0 2px #7c6cff",
  /** Soft halo around a focused field, outside its border. */
  ring: "0 0 0 3px rgba(124, 108, 255, 0.28)",
  /** A recessed well: a faint inner shadow along the top edge. */
  well: "inset 0 1px 2px rgba(0, 0, 0, 0.35)",
  /** A raised surface: a highlight on the top edge and a tight drop. */
  raised: "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 1px 2px rgba(0, 0, 0, 0.35)",
  /** Floating panels: hairline outline, top highlight and a deep drop. */
  popover:
    "0 0 0 1px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 18px 48px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)",
  thumb: "0 1px 3px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(0, 0, 0, 0.3)",
});

export const motion = stylex.defineVars({
  fast: "120ms",
  base: "180ms",
  ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  /** A slight overshoot for things that slide into place (toggles, thumbs). */
  spring: "cubic-bezier(0.34, 1.4, 0.64, 1)",
});
