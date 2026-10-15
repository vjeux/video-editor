import { TEXT_MOTION_PRESETS } from "../../core/text-motion";
import { AUDIO_EFFECTS } from "../../core/audio-effects";
import { ANIMATION_PRESETS, type AnimationPreset } from "../../core/clip-animations";
import type { Easing, Karaoke, TextAnimation, TextMotion, TextStyle } from "../../core/types";

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

/** Every look field, cleared, so a caption preset never inherits leftovers. */
const NO_LOOKS = {
  background: null,
  stroke: null,
  shadow: null,
  glow: null,
  gradient: null,
  highlight: null,
  shine: null,
} as const;

const wordPop: TextMotion = {
  presetId: "pop",
  unit: "word",
  duration: 0.3,
  stagger: 0.08,
  easing: "backOut",
};

/**
 * One-click caption looks from short-form editing: bold outlined words that
 * pop in, Hormozi-style karaoke, a karaoke box, bouncy gaming letters, neon,
 * and a shiny gradient.
 */
export const CAPTION_PRESETS: readonly {
  name: string;
  style: Partial<TextStyle>;
  textMotion: TextMotion | null;
  karaoke: Karaoke | null;
}[] = [
  {
    name: "Bold",
    style: {
      ...NO_LOOKS,
      fontFamily: "Montserrat Variable",
      fontWeight: 900,
      fontSize: 88,
      letterSpacing: -1,
      color: "#ffffff",
      stroke: { color: "#000000", width: 10 },
    },
    textMotion: wordPop,
    karaoke: null,
  },
  {
    name: "Hormozi",
    style: {
      ...NO_LOOKS,
      fontFamily: "Montserrat Variable",
      fontWeight: 900,
      fontSize: 88,
      letterSpacing: -1,
      color: "#ffffff",
      stroke: { color: "#000000", width: 10 },
    },
    textMotion: null,
    karaoke: { color: "#ffd400", mode: "pop" },
  },
  {
    name: "Karaoke",
    style: {
      ...NO_LOOKS,
      fontFamily: "Montserrat Variable",
      fontWeight: 800,
      fontSize: 80,
      letterSpacing: 0,
      color: "#ffffff",
      shadow: { color: "rgba(0, 0, 0, 0.5)", blur: 0.25, x: 0, y: 0.04 },
    },
    textMotion: null,
    karaoke: { color: "#7c6cff", mode: "box" },
  },
  {
    name: "Gaming",
    style: {
      ...NO_LOOKS,
      fontFamily: "Anton",
      fontWeight: 400,
      fontSize: 110,
      letterSpacing: 1,
      color: "#7cff6b",
      stroke: { color: "#06131f", width: 9 },
    },
    textMotion: {
      presetId: "bounce",
      unit: "letter",
      duration: 0.5,
      stagger: 0.04,
      easing: "bounceOut",
    },
    karaoke: null,
  },
  {
    name: "Neon",
    style: {
      ...NO_LOOKS,
      fontFamily: "Montserrat Variable",
      fontWeight: 700,
      fontSize: 96,
      letterSpacing: 2,
      color: "#fff4ff",
      glow: { color: "#ff3bd4", size: 0.5 },
    },
    textMotion: {
      presetId: "fade",
      unit: "letter",
      duration: 0.25,
      stagger: 0.03,
      easing: "easeOut",
    },
    karaoke: null,
  },
  {
    name: "Gradient",
    style: {
      ...NO_LOOKS,
      fontFamily: "Montserrat Variable",
      fontWeight: 900,
      fontSize: 96,
      letterSpacing: -1,
      color: "#ffffff",
      gradient: { from: "#ffd400", to: "#ff3b81", angle: 0 },
      shine: { color: "rgba(255, 255, 255, 0.85)", period: 2.4 },
      shadow: { color: "rgba(0, 0, 0, 0.45)", blur: 0.2, x: 0, y: 0.03 },
    },
    textMotion: {
      presetId: "slideUp",
      unit: "word",
      duration: 0.4,
      stagger: 0.1,
      easing: "easeOut",
    },
    karaoke: null,
  },
];

/** Starting values when a text look is switched on. */
export const TEXT_LOOK_DEFAULTS = {
  glow: { color: "#ff3bd4", size: 0.45 },
  gradient: { from: "#ffd400", to: "#ff3b81", angle: 0 },
  highlight: { color: "#7c6cff", mode: "line", padding: 0.18 },
  shine: { color: "rgba(255, 255, 255, 0.85)", period: 2.4 },
} as const satisfies Pick<
  { [K in keyof TextStyle]: NonNullable<TextStyle[K]> },
  "glow" | "gradient" | "highlight" | "shine"
>;

/** Word-animation presets for the picker: ones that play once, then ones that keep moving. */
export const TEXT_MOTION_GROUPS = [
  { label: "Enter", presets: Object.values(TEXT_MOTION_PRESETS).filter((p) => p.kind === "enter") },
  {
    label: "Continuous",
    presets: Object.values(TEXT_MOTION_PRESETS).filter((p) => p.kind === "continuous"),
  },
];
