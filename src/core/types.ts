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
}

export interface MediaClip extends ClipBase {
  type: "media";
  assetId: Id;
  /** Source time at which the clip starts (the in-point). */
  offset: Seconds;
  speed: number;
  volume: number;
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
}

export interface TextClip extends ClipBase {
  type: "text";
  text: string;
  style: TextStyle;
  animation: TextAnimation;
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
  version: 2;
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
