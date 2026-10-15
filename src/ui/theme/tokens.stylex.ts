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
  pink: "#ff6cb5",
  video: "#3d6df2",
  video2: "#2a4fb8",
  title: "#c06cf2",
  audio: "#23b38a",
  audioDeep: "#165c49",
  music: "#e3a63b",
  danger: "#ff5d6c",
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

export const shadows = stylex.defineVars({
  frame: "0 20px 60px rgba(0, 0, 0, 0.5)",
  pop: "0 12px 30px rgba(0, 0, 0, 0.4)",
  dialog: "0 30px 80px rgba(0, 0, 0, 0.6)",
  focus: "0 0 0 2px #7c6cff",
});
