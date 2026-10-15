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

export function formatTimecode(t: Seconds, fps: number): string {
  const frames = frameIndex(Math.max(0, t), fps);
  const seconds = Math.floor(frames / fps);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames % fps)}`;
}

export function formatDuration(t: Seconds): string {
  const total = Math.floor(Math.max(0, t));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
