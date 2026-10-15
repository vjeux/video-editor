import type { TextAnimation } from "../../core/types";

export const FONTS = [
  { label: "Inter", family: "Inter Variable" },
  { label: "Playfair Display", family: "Playfair Display Variable" },
  { label: "Space Grotesk", family: "Space Grotesk Variable" },
  { label: "Bebas Neue", family: "Bebas Neue" },
  { label: "JetBrains Mono", family: "JetBrains Mono Variable" },
  { label: "Caveat", family: "Caveat Variable" },
] as const;

export const WEIGHTS = [
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Black" },
] as const;

export const COLORS = ["#ffffff", "#f6d27a", "#a99dff", "#5fe0b7", "#ff6c8a", "#111111"] as const;
export const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4] as const;
export const FRAME_RATES = [24, 25, 30, 50, 60] as const;
export const BACKGROUNDS = ["#000000", "#ffffff", "#0e0f12", "#1d1735", "#12261f"] as const;

export const ANIMATIONS: readonly { value: TextAnimation; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "rise", label: "Rise" },
  { value: "type", label: "Type" },
  { value: "blur", label: "Blur" },
];

export const SHORTCUTS = [
  ["Play / pause", "Space"],
  ["Step frame / second", "← → / ⇧"],
  ["Split at playhead", "S"],
  ["Delete / ripple delete", "⌫ / ⇧⌫"],
  ["Select / blade tool", "V / B"],
  ["Add title / marker", "T / M"],
  ["Snapping / loop", "N / L"],
  ["Zoom timeline", "+ / −"],
  ["Undo / redo", "⌘Z / ⇧⌘Z"],
] as const;

/** SliderRow mapping for values stored as 0–1 and shown as percentages. */
export const PERCENT = {
  display: (v: number) => v * 100,
  parse: (v: number) => v / 100,
  suffix: "%",
};

export const BOX_BACKGROUND = "rgba(0, 0, 0, 0.55)";
