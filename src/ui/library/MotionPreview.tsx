import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";
import type { AnimationPreset } from "../../core/clip-animations";
import { colors, radii } from "../theme/tokens.stylex";
import { loopProgress, motionStyle, STILL_PROGRESS } from "./motion";

const styles = stylex.create({
  layer: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
  },
  moved: (transform: string, opacity: number) => ({ transform, opacity }),
  card: {
    paddingBlock: 4,
    paddingInline: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
  },
});

/** An "Aa" card moved by a motion preset; loops the entrance while `animate` is set. */
export function MotionPreview({ preset, animate }: { preset: AnimationPreset; animate: boolean }) {
  const [progress, setProgress] = useState(STILL_PROGRESS);

  useEffect(() => {
    if (!animate) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      setProgress(loopProgress((now - start) / 1000));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  const { transform, opacity } = motionStyle(preset, animate ? progress : STILL_PROGRESS);
  return (
    <div aria-hidden {...stylex.props(styles.layer, styles.moved(transform, opacity))}>
      <span {...stylex.props(styles.card)}>Aa</span>
    </div>
  );
}
