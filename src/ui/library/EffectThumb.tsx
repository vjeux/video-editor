import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import type { EffectDefinition } from "../../core/types";
import { colors } from "../theme/tokens.stylex";
import { animatePreview, paint, requestThumbnail } from "./thumbnails";

const styles = stylex.create({
  canvas: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  hidden: { visibility: "hidden" },
  fallback: { fontSize: 22, fontWeight: 600, color: colors.faint },
});

type Status = "pending" | "ready" | "unavailable";

/**
 * Live preview of an effect over the sample frames: a cached still once
 * scrolled into view, animated while `animate` is set.
 */
export function EffectThumb({
  def,
  fallback,
  animate,
}: {
  def: EffectDefinition;
  /** Shown when previews cannot render (no WebGL2). */
  fallback: string;
  animate: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("pending");

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let cancel = () => {};
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      cancel = requestThumbnail(def, (image) => {
        if (image) paint(el, image);
        setStatus(image ? "ready" : "unavailable");
      });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancel();
    };
  }, [def]);

  useEffect(() => {
    const el = canvas.current;
    if (!animate || status !== "ready" || !el) return;
    return animatePreview(el, def);
  }, [animate, status, def]);

  return (
    <>
      <canvas
        ref={canvas}
        aria-hidden
        {...stylex.props(styles.canvas, status !== "ready" && styles.hidden)}
      />
      {status === "unavailable" && <span {...stylex.props(styles.fallback)}>{fallback}</span>}
    </>
  );
}
