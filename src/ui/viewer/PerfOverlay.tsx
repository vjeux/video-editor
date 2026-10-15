import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";
import { perf, type PerfSnapshot } from "../../engine/perf";
import { fonts } from "../theme/tokens.stylex";

const REFRESH_MS = 500;

const styles = stylex.create({
  hud: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 20,
    margin: 0,
    paddingBlock: 6,
    paddingInline: 8,
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    color: "#c8f7c5",
    fontFamily: fonts.mono,
    fontSize: 10.5,
    lineHeight: 1.5,
    whiteSpace: "pre",
    pointerEvents: "none",
  },
});

const line = (s: PerfSnapshot) =>
  [
    `composites ${s.fps}/s`,
    `render p50 ${s.renderP50.toFixed(1)} p95 ${s.renderP95.toFixed(1)} max ${s.renderMax.toFixed(1)} ms`,
    `video lag p95 ${s.lagP95.toFixed(0)} ms · overdue ${s.overdue}`,
    `seeks ${s.seeks} (p95 ${s.seekP95.toFixed(0)} ms) · dropped ${s.dropped}`,
  ].join("\n");

/** Live playback measurements over the monitor, shown with `?perf` in the URL. */
export function PerfOverlay() {
  const [snapshot, setSnapshot] = useState(() => perf.snapshot());
  useEffect(() => {
    const id = setInterval(() => setSnapshot(perf.snapshot()), REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  return (
    <pre aria-hidden {...stylex.props(styles.hud)}>
      {line(snapshot)}
    </pre>
  );
}
