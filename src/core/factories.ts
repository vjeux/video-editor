import type {
  Asset,
  ClipKind,
  Id,
  MediaClip,
  Project,
  TextClip,
  TextStyle,
  Track,
  TrackKind,
  Transform,
} from "./types";

export const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "Inter Variable",
  fontWeight: 700,
  fontSize: 96,
  letterSpacing: 0,
  color: "#ffffff",
  align: "center",
  background: null,
};

export const DEFAULT_STILL_DURATION = 5;
export const DEFAULT_TEXT_DURATION = 4;

export const TRACK_ACCEPTS: Record<TrackKind, readonly ClipKind[]> = {
  video: ["video", "image"],
  audio: ["audio"],
  text: ["text"],
};

export const TRACK_PREFIX: Record<TrackKind, string> = { video: "V", audio: "A", text: "T" };

export function createProject({ name }: { name: string }): Project {
  return {
    version: 1,
    name,
    settings: { width: 1920, height: 1080, fps: 30, background: "#000000" },
    assets: {},
    tracks: [],
    clips: {},
    markers: [],
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
    fadeIn: 0,
    fadeOut: 0,
    transform: DEFAULT_TRANSFORM,
  };
}

export function createTextClip(at: { id: Id; trackId: Id; start: number; text: string }): TextClip {
  return {
    ...at,
    type: "text",
    duration: DEFAULT_TEXT_DURATION,
    style: DEFAULT_TEXT_STYLE,
    animation: "fade",
    fadeIn: 0,
    fadeOut: 0.3,
    transform: DEFAULT_TRANSFORM,
  };
}
