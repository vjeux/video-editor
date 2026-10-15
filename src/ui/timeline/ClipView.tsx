import * as stylex from "@stylexjs/stylex";
import type { PointerEvent as ReactPointerEvent } from "react";
import { timeToX } from "../../core/layout";
import { clipKind } from "../../core/timeline";
import type { Clip, Project } from "../../core/types";
import { useEditor } from "../../store";
import { colors, fonts } from "../theme/tokens.stylex";
import { ClipArt } from "./ClipArt";
import { LANE_HEIGHT, type Viewport } from "./lanes";

export type ClipEdge = "start" | "end";

const styles = stylex.create({
  clip: {
    position: "absolute",
    top: 4,
    bottom: 4,
    borderRadius: 5,
    overflow: "hidden",
    cursor: "grab",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.12)",
    touchAction: "none",
    filter: { default: null, ":hover": "brightness(1.12)" },
  },
  at: (left: number, width: number) => ({ left, width }),
  blade: { cursor: "crosshair" },
  selected: {
    boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${colors.accent}`,
    zIndex: 2,
  },
  ghost: {
    opacity: 0.85,
    zIndex: 4,
    pointerEvents: "none",
    boxShadow: `0 0 0 2px ${colors.accent2}, 0 10px 24px rgba(0, 0, 0, 0.5)`,
  },
  invalid: { boxShadow: `0 0 0 2px ${colors.danger}` },
  video: { backgroundColor: colors.video2 },
  image: { backgroundColor: colors.video2 },
  audio: { backgroundColor: colors.audioDeep },
  text: { backgroundImage: "linear-gradient(180deg, #8a46b8, #6a3290)" },
  shade: {
    position: "absolute",
    inset: 0,
    backgroundImage: "linear-gradient(180deg, rgba(20, 30, 70, 0.55), transparent 45%)",
    pointerEvents: "none",
  },
  label: {
    position: "absolute",
    left: 6,
    top: 3,
    right: 6,
    fontSize: 10.5,
    fontWeight: 550,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.6)",
    zIndex: 1,
    pointerEvents: "none",
  },
  titleGlyph: { fontFamily: fonts.mono, opacity: 0.7, marginInlineEnd: 6 },
  fade: {
    position: "absolute",
    top: 0,
    bottom: 0,
    pointerEvents: "none",
    zIndex: 1,
  },
  fadeIn: {
    left: 0,
    backgroundImage: "linear-gradient(to bottom right, rgba(0, 0, 0, 0.45) 50%, transparent 50%)",
  },
  fadeOut: {
    right: 0,
    backgroundImage: "linear-gradient(to bottom left, rgba(0, 0, 0, 0.45) 50%, transparent 50%)",
  },
  fadeWidth: (width: number) => ({ width }),
  speed: {
    position: "absolute",
    right: 5,
    bottom: 3,
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: 600,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingBlock: 0,
    paddingInline: 3,
    borderRadius: 3,
    zIndex: 1,
  },
  handle: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 10,
    cursor: "ew-resize",
    zIndex: 3,
    display: "flex",
    alignItems: "stretch",
    paddingBlock: 3,
    paddingInline: 2,
  },
  handleStart: { left: 0, justifyContent: "flex-start" },
  handleEnd: { right: 0, justifyContent: "flex-end" },
  bar: {
    position: "relative",
    width: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.35)",
    opacity: { default: 0, [stylex.when.ancestor(":hover")]: 0.75 },
    transition: "opacity 0.12s",
    "::after": {
      content: '""',
      position: "absolute",
      top: "50%",
      left: "50%",
      width: 2,
      height: 10,
      maxHeight: "60%",
      borderRadius: 1,
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      transform: "translate(-50%, -50%)",
    },
  },
  barSelected: { opacity: 1 },
});

export function ClipView({
  clip,
  project,
  selected,
  ghost,
  invalid,
  view,
  onPointerDown,
}: {
  clip: Clip;
  project: Project;
  selected: boolean;
  ghost: boolean;
  invalid: boolean;
  view: Viewport;
  onPointerDown: (e: ReactPointerEvent, clip: Clip, edge: ClipEdge | null) => void;
}) {
  const pps = useEditor((s) => s.pxPerSecond);
  const blade = useEditor((s) => s.tool === "blade");
  const track = project.tracks.find((t) => t.id === clip.trackId);
  const kind = clipKind(project, clip);
  const asset = clip.type === "media" ? project.assets[clip.assetId] : undefined;
  const x = timeToX(clip.start, pps);
  const width = Math.max(2, timeToX(clip.duration, pps) - 1);
  const height = LANE_HEIGHT[track?.kind ?? "video"] - 8;
  const label = clip.type === "text" ? clip.text.split("\n")[0] : (asset?.name ?? "Missing media");
  const art =
    clip.type !== "media"
      ? null
      : kind === "video" || kind === "image"
        ? "filmstrip"
        : kind === "audio"
          ? "waveform"
          : null;

  return (
    <div
      {...stylex.props(
        stylex.defaultMarker(),
        styles.clip,
        styles[kind],
        styles.at(x, width),
        blade && styles.blade,
        selected && styles.selected,
        ghost && styles.ghost,
        invalid && styles.invalid,
      )}
      onPointerDown={(e) => onPointerDown(e, clip, null)}
      data-clip={clip.id}
    >
      {clip.type === "media" && art && (
        <ClipArt
          clip={clip}
          pxPerSecond={pps}
          clipX={x}
          clipWidth={width}
          height={height}
          view={view}
          mode={art}
        />
      )}
      {(kind === "video" || kind === "image") && <span {...stylex.props(styles.shade)} />}
      <span {...stylex.props(styles.label)}>
        {clip.type === "text" && <span {...stylex.props(styles.titleGlyph)}>T</span>}
        {label}
      </span>
      {clip.fadeIn > 0 && (
        <span
          {...stylex.props(styles.fade, styles.fadeIn, styles.fadeWidth(timeToX(clip.fadeIn, pps)))}
        />
      )}
      {clip.fadeOut > 0 && (
        <span
          {...stylex.props(
            styles.fade,
            styles.fadeOut,
            styles.fadeWidth(timeToX(clip.fadeOut, pps)),
          )}
        />
      )}
      {clip.type === "media" && clip.speed !== 1 && (
        <span {...stylex.props(styles.speed)}>{clip.speed}×</span>
      )}
      {width > 18 &&
        (["start", "end"] as const).map((edge) => (
          <span
            key={edge}
            {...stylex.props(
              styles.handle,
              edge === "start" ? styles.handleStart : styles.handleEnd,
            )}
            onPointerDown={(e) => onPointerDown(e, clip, edge)}
          >
            <span {...stylex.props(styles.bar, selected && styles.barSelected)} />
          </span>
        ))}
    </div>
  );
}
