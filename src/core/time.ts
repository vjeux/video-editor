import type { Seconds } from "./types";

/** Tolerance absorbing float error so 0.1 + 0.2 lands on frame 3, not 2. */
const EPSILON = 1e-6;

const pad = (n: number) => String(n).padStart(2, "0");

export function snapToFrame(t: Seconds, fps: number): Seconds {
  return Math.round(t * fps) / fps;
}

export function frameIndex(t: Seconds, fps: number): number {
  return Math.floor(t * fps + EPSILON);
}

/** NTSC rates (29.97, 59.94) whose timecode drops frame numbers to track the clock. */
const isDropFrameRate = (fps: number) =>
  Math.abs(fps - 30000 / 1001) < 1e-3 || Math.abs(fps - 60000 / 1001) < 1e-3;

/** SMPTE drop-frame: skips the first frame numbers of each minute except every tenth. */
function dropFrameNumber(frames: number, fps: number): number {
  const dropped = Math.round(fps * 0.066666);
  const perTenMinutes = Math.round(fps * 600);
  const perMinute = Math.round(fps) * 60 - dropped;
  const tens = Math.floor(frames / perTenMinutes);
  const rest = frames % perTenMinutes;
  const minutes = rest > dropped ? Math.floor((rest - dropped) / perMinute) : 0;
  return frames + dropped * 9 * tens + dropped * minutes;
}

/**
 * hh:mm:ss:ff counting whole frames at `fps`, labelled by the nominal rate
 * (frames 0–23 at 23.976). 29.97 and 59.94 use drop-frame (`;`) by default.
 */
export function formatTimecode(t: Seconds, fps: number, dropFrame = isDropFrameRate(fps)): string {
  const nominal = Math.round(fps);
  const frames = frameIndex(Math.max(0, t), fps);
  const labelled = dropFrame ? dropFrameNumber(frames, fps) : frames;
  const seconds = Math.floor(labelled / nominal);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const digits = Math.max(2, String(nominal - 1).length);
  const ff = String(labelled % nominal).padStart(digits, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${dropFrame ? ";" : ":"}${ff}`;
}

export function formatDuration(t: Seconds): string {
  const total = Math.floor(Math.max(0, t));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** The start of the frame on screen at `t`. */
export const frameStart = (t: Seconds, fps: number): Seconds => frameIndex(t, fps) / fps;

/** "29.97", "23.976", "60": up to three decimals, trailing zeros trimmed. */
export const formatFps = (fps: number): string => String(Number(fps.toFixed(3)));
