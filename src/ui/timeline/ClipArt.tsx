import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef } from "react";
import { sourceTimeAt } from "../../core/timeline";
import type { MediaClip } from "../../core/types";
import { useMedia } from "../../store";
import { PEAKS_PER_SECOND } from "../../store/media";
import type { Viewport } from "./lanes";

const WAVE_COLORS = { audio: "#5fe0b7", video: "rgba(255,255,255,0.55)" } as const;

const styles = stylex.create({
  canvas: {
    position: "absolute",
    top: 0,
    height: "100%",
    pointerEvents: "none",
  },
  at: (left: number, width: number) => ({ left, width }),
});

/**
 * Filmstrip or waveform for the on-screen part of a clip only, so a long clip
 * at high zoom never allocates a giant canvas.
 */
export function ClipArt({
  clip,
  pxPerSecond,
  clipX,
  clipWidth,
  height,
  view,
  mode,
}: {
  clip: MediaClip;
  pxPerSecond: number;
  clipX: number;
  clipWidth: number;
  height: number;
  view: Viewport;
  mode: "filmstrip" | "waveform";
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const runtime = useMedia((s) => s.assets[clip.assetId]);
  const from = Math.max(0, view.left - clipX);
  const to = Math.min(clipWidth, view.left + view.width - clipX);
  const width = Math.max(0, Math.ceil(to - from));

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const sourceAt = (x: number) => sourceTimeAt(clip, clip.start + (from + x) / pxPerSecond);

    if (mode === "filmstrip" && runtime?.filmstrip) {
      const { frames, interval } = runtime.filmstrip;
      const first = frames[0];
      if (!first) return;
      const tile = (first.width / first.height) * height;
      const offset = from % tile;
      for (let x = -offset; x < width; x += tile) {
        const index = Number.isFinite(interval) ? Math.round(sourceAt(x + tile / 2) / interval) : 0;
        const frame = frames[Math.min(frames.length - 1, Math.max(0, index))];
        if (frame) ctx.drawImage(frame, x, 0, tile, height);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(x + tile - 1, 0, 1, height);
      }
    }

    if (mode === "waveform" && runtime?.peaks) {
      const { peaks } = runtime;
      const mid = height / 2 + 6;
      const amp = (height - 16) / 2;
      ctx.fillStyle = WAVE_COLORS[runtime.filmstrip ? "video" : "audio"];
      for (let x = 0; x < width; x++) {
        const a = Math.floor(sourceAt(x) * PEAKS_PER_SECOND);
        const b = Math.max(a + 1, Math.floor(sourceAt(x + 1) * PEAKS_PER_SECOND));
        let peak = 0;
        for (let i = a; i < b; i++) peak = Math.max(peak, peaks[i] ?? 0);
        const h = Math.max(0.5, Math.min(1, peak * clip.volume) * amp);
        ctx.fillRect(x, mid - h, 1, h * 2);
      }
    }
  }, [clip, pxPerSecond, from, width, height, runtime, mode]);

  if (width === 0) return null;
  return <canvas ref={canvas} {...stylex.props(styles.canvas, styles.at(from, width))} />;
}
