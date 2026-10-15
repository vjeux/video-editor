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

interface ClipBase {
  id: Id;
  trackId: Id;
  start: Seconds;
  duration: Seconds;
  fadeIn: Seconds;
  fadeOut: Seconds;
  transform: Transform;
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

export type Clip = MediaClip | TextClip;

export type ClipKind = AssetKind | "text";

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
  version: 1;
  name: string;
  settings: ProjectSettings;
  assets: Record<Id, Asset>;
  /** Top to bottom as shown in the timeline; earlier tracks composite above later ones. */
  tracks: Track[];
  clips: Record<Id, Clip>;
  markers: Marker[];
}

export type IdFactory = () => Id;
