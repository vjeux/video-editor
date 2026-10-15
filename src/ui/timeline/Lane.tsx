import * as stylex from "@stylexjs/stylex";
import type { PointerEvent as ReactPointerEvent } from "react";
import { clipsOnTrack } from "../../core/timeline";
import type { Clip, Id, Project, Track } from "../../core/types";
import { useEditor } from "../../store";
import { colors } from "../theme/tokens.stylex";
import { ClipView, type ClipEdge } from "./ClipView";
import { LANE_HEIGHT, type Viewport } from "./lanes";

export type DropState = "ok" | "bad";

const styles = stylex.create({
  lane: {
    position: "relative",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
  },
  height: (height: number) => ({ height }),
  striped: { backgroundColor: "rgba(255, 255, 255, 0.012)" },
  locked: {
    backgroundColor: "transparent",
    backgroundImage:
      "repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.015) 0 8px, transparent 8px 16px)",
  },
  ok: { backgroundColor: "rgba(124, 108, 255, 0.08)", backgroundImage: "none" },
  bad: { backgroundColor: "rgba(255, 93, 108, 0.05)", backgroundImage: "none" },
});

/** One track's lane, rendering the clips of `project` (the live drag preview while dragging). */
export function Lane({
  track,
  project,
  striped,
  dragIds,
  invalid,
  drop,
  view,
  onPointerDown,
  onClipPointerDown,
}: {
  track: Track;
  project: Project;
  striped: boolean;
  dragIds: Id[];
  /** Whether the dragged clips are at an invalid position. */
  invalid: boolean;
  drop: DropState | null;
  view: Viewport;
  onPointerDown: (e: ReactPointerEvent) => void;
  onClipPointerDown: (e: ReactPointerEvent, clip: Clip, edge: ClipEdge | null) => void;
}) {
  const selection = useEditor((s) => s.selection);
  return (
    <div
      {...stylex.props(
        styles.lane,
        styles.height(LANE_HEIGHT[track.kind]),
        striped && styles.striped,
        track.locked && styles.locked,
        drop && styles[drop],
      )}
      onPointerDown={onPointerDown}
    >
      {clipsOnTrack(project, track.id).map((clip) => (
        <ClipView
          key={clip.id}
          clip={clip}
          project={project}
          selected={selection.includes(clip.id)}
          ghost={dragIds.includes(clip.id)}
          invalid={invalid && dragIds.includes(clip.id)}
          view={view}
          onPointerDown={onClipPointerDown}
        />
      ))}
    </div>
  );
}
