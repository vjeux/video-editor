import * as stylex from "@stylexjs/stylex";
import type { PointerEvent as ReactPointerEvent } from "react";
import { timeToX } from "../../core/layout";
import { transitionWindow } from "../../core/layers";
import { clipsOnTrack } from "../../core/timeline";
import type { Clip, Id, Project, Seconds, Track } from "../../core/types";
import { useEditor } from "../../store";
import { colors } from "../theme/tokens.stylex";
import { ClipView, type ClipEdge } from "./ClipView";
import { effectName } from "./effect-names";
import { LANE_HEIGHT, type Viewport } from "./lanes";
import { TransitionBadge } from "./TransitionBadge";

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
  cut: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 3,
    marginInlineStart: -1.5,
    borderRadius: 2,
    backgroundColor: colors.pink,
    boxShadow: `0 0 8px ${colors.pink}`,
    zIndex: 6,
    pointerEvents: "none",
  },
  at: (left: number) => ({ left }),
});

/** One track's lane, rendering the clips of `project` (the live drag preview while dragging). */
export function Lane({
  track,
  project,
  striped,
  dragIds,
  invalid,
  drop,
  effectTargets,
  cutAt,
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
  /** Clips an effect being dragged from the library would land on. */
  effectTargets: readonly Id[];
  /** The cut a transition being dragged from the library would land on. */
  cutAt: Seconds | null;
  view: Viewport;
  onPointerDown: (e: ReactPointerEvent) => void;
  onClipPointerDown: (e: ReactPointerEvent, clip: Clip, edge: ClipEdge | null) => void;
}) {
  const selection = useEditor((s) => s.selection);
  const pps = useEditor((s) => s.pxPerSecond);
  const clips = clipsOnTrack(project, track.id);
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
      {clips.map((clip) => (
        <ClipView
          key={clip.id}
          clip={clip}
          project={project}
          selected={selection.includes(clip.id)}
          ghost={dragIds.includes(clip.id)}
          invalid={invalid && dragIds.includes(clip.id)}
          target={effectTargets.includes(clip.id)}
          view={view}
          onPointerDown={onClipPointerDown}
        />
      ))}
      {clips.map((clip) => {
        const span = transitionWindow(project, clip);
        if (!span) return null;
        return (
          <TransitionBadge
            key={`transition-${clip.id}`}
            clipId={clip.id}
            transition={span.transition}
            name={effectName(project, span.transition.effectId)}
            left={timeToX(span.start, pps)}
            width={timeToX(span.duration, pps)}
            locked={track.locked}
          />
        );
      })}
      {cutAt !== null && <div {...stylex.props(styles.cut, styles.at(timeToX(cutAt, pps)))} />}
    </div>
  );
}
