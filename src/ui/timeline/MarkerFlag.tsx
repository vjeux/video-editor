import * as stylex from "@stylexjs/stylex";
import { seek } from "../../app/playback";
import { timeToX } from "../../core/layout";
import { formatDuration } from "../../core/time";
import type { Marker } from "../../core/types";
import { useEditor } from "../../store";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  flag: {
    position: "absolute",
    top: 9,
    width: 10,
    height: 10,
    transform: "translateX(-50%) rotate(45deg)",
    backgroundColor: colors.music,
    borderRadius: 2,
    cursor: "pointer",
    filter: { default: null, ":hover": "brightness(1.2)" },
  },
  at: (left: number) => ({ left }),
});

/** Ruler flag: click jumps to the marker, double-click removes it. */
export function MarkerFlag({ marker }: { marker: Marker }) {
  const pps = useEditor((s) => s.pxPerSecond);
  const commit = useEditor((s) => s.commit);
  return (
    <div
      {...stylex.props(styles.flag, styles.at(timeToX(marker.time, pps)))}
      title={`${marker.label || "Marker"} · ${formatDuration(marker.time)} — click to jump, double-click to remove`}
      onPointerDown={(e) => {
        e.stopPropagation();
        seek(marker.time);
      }}
      onDoubleClick={() =>
        commit((p) => ({ ...p, markers: p.markers.filter((x) => x.id !== marker.id) }))
      }
    />
  );
}
