export type Id = string;

/** Seconds on the project timeline. */
export type Seconds = number;

export type AssetKind = "video" | "audio" | "image";

export interface Asset {
  id: Id;
  name: string;
  kind: AssetKind;
  /** Source duration; `null` for stills, which can be stretched indefinitely. */
  duration: Seconds | null;
  width: number;
  height: number;
  hasAudio: boolean;
  /** Frames per second the video was recorded at, when known (not for stills or audio). */
  frameRate?: number;
}

export type TrackKind = "video" | "audio" | "text";

export interface Track {
  id: Id;
  kind: TrackKind;
  name: string;
  muted: boolean;
  solo: boolean;
  hidden: boolean;
  locked: boolean;
}

export interface Transform {
  /** Offset from the frame centre, in project pixels. */
  x: number;
  y: number;
  /** 1 = media fitted inside the frame (contain). */
  scale: number;
  /** Degrees, clockwise. */
  rotation: number;
  opacity: number;
}

/** A shader parameter value: numbers, toggles, hex colours ("#rrggbb") or 2D vectors. */
export type ParamValue = number | boolean | string | readonly [number, number];
export type Params = Readonly<Record<string, ParamValue>>;

/** One entry of a clip's effect stack; `effectId` names an `EffectDefinition`. */
export interface EffectInstance {
  id: Id;
  effectId: string;
  enabled: boolean;
  params: Params;
}

/** A transition from the previous adjacent clip on the track into this one, centred on the cut. */
export interface TransitionInstance {
  effectId: string;
  duration: Seconds;
  params: Params;
}

export type Easing = "linear" | "easeOut" | "easeInOut" | "backOut" | "bounceOut" | "elasticOut";

/**
 * An enter, exit or loop animation. Exits play the preset in reverse; for
 * loops `duration` is the period of one cycle.
 */
export interface ClipAnimation {
  presetId: string;
  duration: Seconds;
  easing: Easing;
}

interface ClipBase {
  id: Id;
  trackId: Id;
  start: Seconds;
  duration: Seconds;
  fadeIn: Seconds;
  fadeOut: Seconds;
  transform: Transform;
  /** Applied in order, in frame space, after the clip is placed. */
  effects: readonly EffectInstance[];
  transitionIn: TransitionInstance | null;
  animationIn: ClipAnimation | null;
  animationOut: ClipAnimation | null;
  animationLoop: ClipAnimation | null;
}

export interface FrameInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export interface MaskPoint {
  x: number;
  y: number;
}
export type MediaBlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "soft-light"
  | "hard-light"
  | "difference"
  | "exclusion";
export interface FrameShadow {
  color: string;
  blur: number;
  x: number;
  y: number;
}
export interface FrameFill {
  type: "solid" | "linear";
  color: string;
  color2: string;
  angle: number;
}
export interface FrameBorder {
  color: string;
  width: number;
  style: "solid" | "dashed" | "dotted" | "double" | "gradient";
  color2: string;
  angle: number;
}

/** Frame styling in project pixels, before the clip's scale and rotation. */
export interface MediaAppearance {
  radius: number;
  background: FrameFill | null;
  /** Insets within the frame; linked is an editing preference. */
  padding: FrameInsets & { linked: boolean };
  /** Fractions removed from each source edge; opposing sides must total < 1. */
  crop: FrameInsets;
  /** Null follows the cropped source aspect. Circle masks always use a square frame. */
  aspect: number | null;
  fit: "contain" | "cover";
  /** Alignment in the padded frame, 0–1 on each axis. */
  position: MaskPoint;
  mask: {
    shape: "rectangle" | "circle" | "ellipse" | "diamond" | "hexagon" | "custom";
    points: readonly MaskPoint[];
  };
  feather: number;
  blendMode: MediaBlendMode;
  /** Drawn inside the frame so the clip's dimensions stay unchanged. */
  border: FrameBorder | null;
  /** An outer frame shadow; offsets follow the clip's rotation. */
  shadow: FrameShadow | null;
  innerShadow: FrameShadow | null;
  glow: { color: string; blur: number } | null;
}

export interface MediaClip extends ClipBase {
  type: "media";
  assetId: Id;
  /** Source time at which the clip starts (the in-point). */
  offset: Seconds;
  speed: number;
  volume: number;
  /** Variable-speed curve (a preset id); the clip's average speed stays `speed`. */
  speedRamp: string | null;
  /** Web Audio effect chain applied to the clip's sound, in order. */
  audioEffects: readonly EffectInstance[];
  appearance: MediaAppearance;
}

export type TextAnimation = "none" | "fade" | "rise" | "type" | "blur";
export type TextAlign = "left" | "center" | "right";

export interface TextStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  letterSpacing: number;
  color: string;
  align: TextAlign;
  /** Translucent box behind the text; `null` for none. */
  background: string | null;
  /** Outline around the glyphs (caption style); `null` for none. */
  stroke: { color: string; width: number } | null;
  /** Drop shadow; blur and offsets are fractions of the font size. */
  shadow: { color: string; blur: number; x: number; y: number } | null;
  /** Neon-style glow; `size` is a fraction of the font size. */
  glow: { color: string; size: number } | null;
  /** Gradient fill replacing `color`; angle in degrees (0 = left → right). */
  gradient: { from: string; to: string; angle: number } | null;
  /** Rounded box behind each line or each word; `padding` is a fraction of the font size. */
  highlight: { color: string; mode: "line" | "word"; padding: number } | null;
  /** A light band sweeping across the glyphs every `period` seconds. */
  shine: { color: string; period: number } | null;
}

/** The units a title is split into for staggered animation. */
export type TextUnit = "letter" | "word" | "line";

/** Per-unit enter animation: each unit starts `stagger` seconds after the previous. */
export interface TextMotion {
  presetId: string;
  unit: TextUnit;
  duration: Seconds;
  stagger: Seconds;
  easing: Easing;
}

/** Words light up in turn across the clip, like sung lyrics or spoken captions. */
export interface Karaoke {
  color: string;
  /** "fill" recolours spoken words; "pop" also scales the current word; "box" puts a box behind it. */
  mode: "fill" | "pop" | "box";
}

/** A spoken word and when it is said. */
export interface TimedWord {
  text: string;
  start: Seconds;
  end: Seconds;
}

export interface TextClip extends ClipBase {
  type: "text";
  text: string;
  style: TextStyle;
  animation: TextAnimation;
  textMotion: TextMotion | null;
  karaoke: Karaoke | null;
  /** When each word is spoken, relative to the clip's start (from auto-captions). */
  words: readonly TimedWord[] | null;
}

/** Applies its effects to everything composited below it while active. */
export interface AdjustmentClip extends ClipBase {
  type: "adjustment";
}

export type Clip = MediaClip | TextClip | AdjustmentClip;

export type ClipKind = AssetKind | "text" | "adjustment";

export type EffectKind = "effect" | "transition";
export type ParamType = "float" | "int" | "bool" | "color" | "vec2";

export interface ParamDef {
  key: string;
  label: string;
  type: ParamType;
  default: ParamValue;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * A GLSL effect or transition. Effects implement `vec4 effect(vec2 uv)` and
 * transitions `vec4 transition(vec2 uv)` (the gl-transitions convention);
 * parameters are declared as uniforms with `// = default` comments.
 */
export interface EffectDefinition {
  id: string;
  name: string;
  kind: EffectKind;
  category: string;
  description: string;
  author: string;
  source: string;
  params: readonly ParamDef[];
  /** 3D colour lookup table for LUT effects: RGB8 cube of `size`³, base64. */
  lut: { size: number; data: string } | null;
}

export interface Marker {
  id: Id;
  time: Seconds;
  label: string;
}

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  background: string;
}

export interface Project {
  version: 4;
  name: string;
  settings: ProjectSettings;
  assets: Record<Id, Asset>;
  /** Top to bottom as shown in the timeline; earlier tracks composite above later ones. */
  tracks: Track[];
  clips: Record<Id, Clip>;
  markers: Marker[];
  /** User-created and imported effects, saved with the project. */
  customEffects: Record<string, EffectDefinition>;
}

export type IdFactory = () => Id;
