import { AUDIO_EFFECTS } from "../../core/audio-effects";
import { ANIMATION_PRESETS, type AnimationPreset } from "../../core/clip-animations";
import type { Easing, TextAnimation, TextStyle } from "../../core/types";

export const FONTS = [
  { label: "Inter", family: "Inter Variable" },
  { label: "Montserrat", family: "Montserrat Variable" },
  { label: "Anton", family: "Anton" },
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
  ["Freeze frame", "F"],
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

export const EASING_LABELS: Record<Easing, string> = {
  linear: "Linear",
  easeOut: "Ease out",
  easeInOut: "Ease in-out",
  backOut: "Overshoot",
  bounceOut: "Bounce",
  elasticOut: "Elastic",
};

const PRESET_GROUP_LABELS: Record<AnimationPreset["group"], string> = {
  motion: "Motion",
  reveal: "Reveal",
  loop: "Loop",
};

const groupsOf = (groups: readonly AnimationPreset["group"][]) =>
  groups.map((group) => ({
    label: PRESET_GROUP_LABELS[group],
    presets: Object.values(ANIMATION_PRESETS).filter((p) => p.group === group),
  }));

/** Preset groups each animation slot can hold: loops cycle, enters and exits play once. */
export const ANIMATION_GROUPS: Record<"in" | "out" | "loop", ReturnType<typeof groupsOf>> = {
  in: groupsOf(["motion", "reveal"]),
  out: groupsOf(["motion", "reveal"]),
  loop: groupsOf(["loop"]),
};

/** Length given to an animation when it is first picked. */
export const DEFAULT_ANIMATION_DURATION = 0.5;

/** Audio effects for the picker, grouped by what they're for. */
export const AUDIO_EFFECT_GROUPS = (["Voice", "Fix", "Space", "Character", "Mix"] as const).map(
  (category) => ({
    category,
    effects: Object.values(AUDIO_EFFECTS).filter((e) => e.category === category),
  }),
);

/** Caption looks from short-form editing: bold outlined white, yellow highlight, condensed gaming. */
export const CAPTION_PRESETS = [
  {
    name: "Bold",
    animation: "none",
    style: {
      fontFamily: "Montserrat Variable",
      fontWeight: 900,
      fontSize: 88,
      letterSpacing: -1,
      color: "#ffffff",
      background: null,
      stroke: { color: "#000000", width: 10 },
    },
  },
  {
    name: "Highlight",
    animation: "none",
    style: {
      fontFamily: "Montserrat Variable",
      fontWeight: 900,
      fontSize: 88,
      letterSpacing: -1,
      color: "#ffd400",
      background: null,
      stroke: { color: "#000000", width: 10 },
    },
  },
  {
    name: "Gaming",
    animation: "none",
    style: {
      fontFamily: "Anton",
      fontWeight: 400,
      fontSize: 110,
      letterSpacing: 1,
      color: "#7cff6b",
      background: null,
      stroke: { color: "#06131f", width: 9 },
    },
  },
] as const satisfies readonly {
  name: string;
  animation: TextAnimation;
  style: Partial<TextStyle>;
}[];
