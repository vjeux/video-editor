import type {
  AdjustmentClip,
  Asset,
  ClipKind,
  Id,
  FrameBorder,
  FrameFill,
  MediaAppearance,
  MediaClip,
  Project,
  TextClip,
  TextStyle,
  Track,
  TrackKind,
  Transform,
} from "./types";

export const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };

export const DEFAULT_MEDIA_BACKGROUND: FrameFill = {
  type: "solid",
  color: "#ffffff",
  color2: "#8b74ff",
  angle: 135,
};
export const DEFAULT_MEDIA_BORDER: FrameBorder = {
  color: "#ffffff",
  width: 4,
  style: "solid",
  color2: "#8b74ff",
  angle: 135,
};
export const DEFAULT_MEDIA_APPEARANCE: MediaAppearance = {
  radius: 0,
  border: null,
  shadow: null,
  background: null,
  padding: { top: 0, right: 0, bottom: 0, left: 0, linked: true },
  crop: { top: 0, right: 0, bottom: 0, left: 0 },
  aspect: null,
  fit: "contain",
  position: { x: 0.5, y: 0.5 },
  mask: {
    shape: "rectangle",
    points: [
      { x: 0.5, y: 0 },
      { x: 1, y: 0.4 },
      { x: 0.8, y: 1 },
      { x: 0.2, y: 1 },
      { x: 0, y: 0.4 },
    ],
  },
  feather: 0,
  blendMode: "normal",
  innerShadow: null,
  glow: null,
};
export const DEFAULT_MEDIA_SHADOW = { color: "rgba(0, 0, 0, 0.4)", blur: 32, x: 0, y: 16 };

/** The subtle legibility shadow titles have always had, now adjustable. */
export const DEFAULT_TEXT_SHADOW = { color: "rgba(0, 0, 0, 0.35)", blur: 0.2, x: 0, y: 0.02 };

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Inter Variable",
  fontWeight: 700,
  fontSize: 96,
  letterSpacing: 0,
  color: "#ffffff",
  align: "center",
  background: null,
  stroke: null,
  shadow: DEFAULT_TEXT_SHADOW,
  glow: null,
  gradient: null,
  highlight: null,
  shine: null,
};

export const DEFAULT_STILL_DURATION = 5;
export const DEFAULT_TEXT_DURATION = 4;

export const TRACK_ACCEPTS: Record<TrackKind, readonly ClipKind[]> = {
  video: ["video", "image", "adjustment"],
  audio: ["audio"],
  text: ["text"],
};

export const TRACK_PREFIX: Record<TrackKind, string> = { video: "V", audio: "A", text: "T" };

export function createProject({ name }: { name: string }): Project {
  return {
    version: 4,
    name,
    settings: { width: 1920, height: 1080, fps: 30, background: "#000000" },
    assets: {},
    tracks: [],
    clips: {},
    markers: [],
    customEffects: {},
  };
}

export function createTrack(kind: TrackKind, id: Id, name: string): Track {
  return { id, kind, name, muted: false, solo: false, hidden: false, locked: false };
}

export function createMediaClip(
  asset: Asset,
  at: { id: Id; trackId: Id; start: number },
): MediaClip {
  return {
    ...at,
    type: "media",
    assetId: asset.id,
    duration: asset.duration ?? DEFAULT_STILL_DURATION,
    offset: 0,
    speed: 1,
    volume: 1,
    speedRamp: null,
    audioEffects: [],
    appearance: DEFAULT_MEDIA_APPEARANCE,
    fadeIn: 0,
    fadeOut: 0,
    transform: DEFAULT_TRANSFORM,
    effects: [],
    transitionIn: null,
    animationIn: null,
    animationOut: null,
    animationLoop: null,
  };
}

export function createTextClip(at: { id: Id; trackId: Id; start: number; text: string }): TextClip {
  return {
    ...at,
    type: "text",
    duration: DEFAULT_TEXT_DURATION,
    style: DEFAULT_TEXT_STYLE,
    // No intro by default: a new title must be visible where it is added.
    animation: "none",
    textMotion: null,
    karaoke: null,
    words: null,
    fadeIn: 0,
    fadeOut: 0.3,
    transform: DEFAULT_TRANSFORM,
    effects: [],
    transitionIn: null,
    animationIn: null,
    animationOut: null,
    animationLoop: null,
  };
}

export const DEFAULT_ADJUSTMENT_DURATION = 5;

export function createAdjustmentClip(at: { id: Id; trackId: Id; start: number }): AdjustmentClip {
  return {
    ...at,
    type: "adjustment",
    duration: DEFAULT_ADJUSTMENT_DURATION,
    fadeIn: 0,
    fadeOut: 0,
    transform: DEFAULT_TRANSFORM,
    effects: [],
    transitionIn: null,
    animationIn: null,
    animationOut: null,
    animationLoop: null,
  };
}
