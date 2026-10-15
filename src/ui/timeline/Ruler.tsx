import * as stylex from "@stylexjs/stylex";
import type { PointerEvent as ReactPointerEvent } from "react";
import { timeToX, visibleTicks, xToTime } from "../../core/layout";
import { formatDuration } from "../../core/time";
import { useEditor } from "../../store";
import { colors, fonts } from "../theme/tokens.stylex";
import type { Viewport } from "./lanes";
import { MarkerFlag } from "./MarkerFlag";

const styles = stylex.create({
  ruler: {
    height: 28,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
    position: "sticky",
    top: 0,
    backgroundColor: colors.panel,
    cursor: "ew-resize",
    zIndex: 6,
  },
  tick: {
    position: "absolute",
    bottom: 0,
    width: 1,
    height: 6,
    backgroundColor: colors.line2,
  },
  major: { height: 12, backgroundColor: colors.faint },
  label: {
    position: "absolute",
    top: 4,
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.faint,
    transform: "translateX(4px)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
  },
  at: (left: number) => ({ left }),
  work: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 3,
    backgroundColor: "rgba(124, 108, 255, 0.5)",
  },
  workWidth: (width: number) => ({ width }),
});

const tickLabel = (time: number) =>
  `${formatDuration(time)}${time % 1 ? `.${Math.round((time % 1) * 10)}` : ""}`;

export function Ruler({
  view,
  duration,
  onScrub,
}: {
  view: Viewport;
  duration: number;
  onScrub: (e: ReactPointerEvent) => void;
}) {
  const pps = useEditor((s) => s.pxPerSecond);
  const markers = useEditor((s) => s.project.markers);
  const { ticks } = visibleTicks({
    pxPerSecond: pps,
    from: xToTime(view.left, pps),
    to: xToTime(view.left + view.width, pps),
  });
  return (
    <div {...stylex.props(styles.ruler)} onPointerDown={onScrub}>
      {ticks.map((tick) => (
        <div
          key={tick.time}
          {...stylex.props(
            styles.tick,
            tick.major && styles.major,
            styles.at(timeToX(tick.time, pps)),
          )}
        />
      ))}
      {ticks
        .filter((t) => t.major)
        .map((tick) => (
          <div
            key={`l${tick.time}`}
            {...stylex.props(styles.label, styles.at(timeToX(tick.time, pps)))}
          >
            {tickLabel(tick.time)}
          </div>
        ))}
      <div {...stylex.props(styles.work, styles.workWidth(timeToX(duration, pps)))} />
      {markers.map((m) => (
        <MarkerFlag key={m.id} marker={m} />
      ))}
    </div>
  );
}
