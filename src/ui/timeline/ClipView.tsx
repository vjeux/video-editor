import * as stylex from "@stylexjs/stylex";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  removeAudioEffectFrom,
  reorderAudioEffect,
  toggleAudioEffect,
} from "../../app/audio-effects";
import { removeEffectFrom, reorderEffect, toggleEffect } from "../../app/effects";
import { AUDIO_EFFECTS } from "../../core/audio-effects";
import { timeToX } from "../../core/layout";
import { transitionWindow } from "../../core/layers";
import { clipEnd, clipKind, clipsOnTrack } from "../../core/timeline";
import type { Clip, Project } from "../../core/types";
import { useEditor } from "../../store";
import { useSilences } from "../../store/silences";
import { colors, fonts } from "../theme/tokens.stylex";
import { AnimationCap } from "./AnimationCap";
import { capLabel } from "./cap-label";
import { ClipArt } from "./ClipArt";
import { effectChipMenu, type ChipActions } from "./effect-chip-menu";
import { EffectChips, type ChipItem } from "./EffectChips";
import { effectName, effectNames } from "./effect-names";
import { LoopBadge } from "./LoopBadge";
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
    // Clip surfaces stay dark in both themes, including their media thumbnails.
    color: "#f8faff",
    touchAction: "none",
    filter: { default: null, ":hover": "brightness(1.12)" },
  },
  at: (left: number, width: number) => ({ left, width }),
  /** Starts the label after an incoming transition's half of the overlap. */
  inset: (left: number) => ({ left }),
  blade: { cursor: "crosshair" },
  selected: {
    boxShadow: `inset 0 0 0 2px ${colors.accent}, inset 0 0 0 3.5px #fff`,
    zIndex: 2,
  },
  ghost: {
    opacity: 0.85,
    zIndex: 4,
    pointerEvents: "none",
    boxShadow: `inset 0 0 0 2px ${colors.accent2}, 0 10px 24px rgba(0, 0, 0, 0.5)`,
  },
  invalid: { boxShadow: `inset 0 0 0 2px ${colors.danger}` },
  target: {
    boxShadow: `inset 0 0 0 2px ${colors.pink}, inset 0 0 14px ${colors.pink}`,
    filter: "brightness(1.2)",
    zIndex: 2,
  },
  video: { backgroundColor: colors.video2 },
  image: { backgroundColor: colors.video2 },
  audio: { backgroundColor: colors.audioDeep },
  text: { backgroundImage: "linear-gradient(180deg, #8a46b8, #6a3290)" },
  adjustment: {
    borderStyle: "dashed",
    borderColor: "rgba(95, 224, 210, 0.55)",
    backgroundColor: "#214c48",
    backgroundImage:
      "repeating-linear-gradient(135deg, rgba(95, 224, 210, 0.16) 0 6px, transparent 6px 12px)",
  },
  shade: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(180deg, rgba(12, 18, 35, 0.8), rgba(12, 18, 35, 0.62) 20px, transparent 42px)",
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
  adjustmentName: { color: "#9ff0e6", marginInlineEnd: 6 },
  adjustmentEffects: { opacity: 0.75, fontWeight: 450 },
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
    width: 14,
    cursor: "ew-resize",
    zIndex: 3,
    display: "flex",
    alignItems: "center",
    paddingBlock: 3,
    paddingInline: 3,
    backgroundColor: { default: "transparent", ":hover": "rgba(255, 255, 255, 0.14)" },
  },
  handleStart: { left: 0, justifyContent: "flex-start" },
  handleEnd: { right: 0, justifyContent: "flex-end" },
  bar: {
    position: "relative",
    width: 3,
    height: 20,
    maxHeight: "65%",
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.35)",
    opacity: { default: 0, [stylex.when.ancestor(":hover")]: 0.75 },
    transition: "opacity 0.12s",
  },
  barSelected: { opacity: 1 },
  /** A pause that silence removal would cut. */
  silence: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 2,
    pointerEvents: "none",
    backgroundColor: "rgba(255, 93, 108, 0.28)",
    backgroundImage:
      "repeating-linear-gradient(135deg, rgba(255, 93, 108, 0.45) 0 4px, transparent 4px 9px)",
    boxShadow: "inset 1px 0 0 rgba(255, 93, 108, 0.9), inset -1px 0 0 rgba(255, 93, 108, 0.9)",
  },
  span: (left: number, width: number) => ({ left, width }),
});

/** Clips shorter than this have no room for the chip strip under their label. */
const CHIPS_MIN_HEIGHT = 36;

/**
 * The effect stack a clip shows as chips: audio clips show their audio
 * chain, everything else its visual effects, each bound to its commands.
 */
function chipsFor(project: Project, clip: Clip, audio: boolean) {
  if (audio && clip.type === "media") {
    const stack = clip.audioEffects;
    return {
      items: stack.map((e): ChipItem => ({
        id: e.id,
        name: AUDIO_EFFECTS[e.effectId]?.name ?? e.effectId,
        enabled: e.enabled,
      })),
      toggle: (id: string, enabled: boolean) => toggleAudioEffect(clip.id, id, enabled),
      actions: (id: string): ChipActions => ({
        toggle: (enabled) => toggleAudioEffect(clip.id, id, enabled),
        move: (index) => reorderAudioEffect(clip.id, id, index),
        remove: () => removeAudioEffectFrom(clip.id, id),
      }),
    };
  }
  return {
    items: clip.effects.map((e): ChipItem => ({
      id: e.id,
      name: effectName(project, e.effectId),
      enabled: e.enabled,
    })),
    toggle: (id: string, enabled: boolean) => toggleEffect(clip.id, id, enabled),
    actions: (id: string): ChipActions => ({
      toggle: (enabled) => toggleEffect(clip.id, id, enabled),
      move: (index) => reorderEffect(clip.id, id, index),
      remove: () => removeEffectFrom(clip.id, id),
    }),
  };
}

export function ClipView({
  clip,
  project,
  selected,
  ghost,
  invalid,
  target,
  view,
  onPointerDown,
}: {
  clip: Clip;
  project: Project;
  selected: boolean;
  ghost: boolean;
  invalid: boolean;
  /** Highlighted as the drop target of an effect dragged from the library. */
  target: boolean;
  view: Viewport;
  onPointerDown: (e: ReactPointerEvent, clip: Clip, edge: ClipEdge | null) => void;
}) {
  const pps = useEditor((s) => s.pxPerSecond);
  const select = useEditor((s) => s.select);
  const silences = useSilences((s) => (s.preview?.clipId === clip.id ? s.preview.spans : null));
  const blade = useEditor((s) => s.tool === "blade");
  const track = project.tracks.find((t) => t.id === clip.trackId);
  const kind = clipKind(project, clip);
  const asset = clip.type === "media" ? project.assets[clip.assetId] : undefined;
  const x = timeToX(clip.start, pps);
  const width = Math.max(2, timeToX(clip.duration, pps) - 1);
  const height = LANE_HEIGHT[track?.kind ?? "video"] - 8;
  const label =
    clip.type === "text"
      ? clip.text.split("\n")[0]
      : clip.type === "adjustment"
        ? effectNames(project, clip.effects).join(", ")
        : (asset?.name ?? "Missing media");
  const locked = track?.locked ?? false;
  // Transitions cover half their window on each side of a cut; keep labels clear of them.
  const coveredIn = timeToX(transitionWindow(project, clip)?.duration ?? 0, pps) / 2;
  const next = clipsOnTrack(project, clip.trackId).find(
    (c) => c.id !== clip.id && Math.abs(c.start - clipEnd(clip)) < 1e-6,
  );
  const coveredOut = next ? timeToX(transitionWindow(project, next)?.duration ?? 0, pps) / 2 : 0;
  const inset = 6 + coveredIn;
  // Effect chips share the bottom row with the animation caps' labels.
  const capIn = capLabel(clip, "in", pps);
  const capOut = capLabel(clip, "out", pps);
  const chipsFrom = inset + (capIn ? capIn.width + 4 : 0);
  const chipsTo = width - 6 - coveredOut - (capOut ? capOut.width + 4 : 0);
  const chips = chipsFor(project, clip, kind === "audio");
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
        target && styles.target,
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
      <span {...stylex.props(styles.label, styles.inset(inset))}>
        {clip.type === "text" && <span {...stylex.props(styles.titleGlyph)}>T</span>}
        {clip.type === "adjustment" && (
          <span {...stylex.props(styles.adjustmentName)}>Adjustment</span>
        )}
        <span {...stylex.props(clip.type === "adjustment" && styles.adjustmentEffects)}>
          {label}
        </span>
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
      <AnimationCap
        clip={clip}
        which="in"
        pps={pps}
        height={height}
        edgeInset={coveredIn}
        locked={locked}
      />
      <AnimationCap
        clip={clip}
        which="out"
        pps={pps}
        height={height}
        edgeInset={coveredOut}
        locked={locked}
      />
      <LoopBadge clip={clip} locked={locked} />
      {height >= CHIPS_MIN_HEIGHT && chips.items.length > 0 && (
        <EffectChips
          items={chips.items}
          width={chipsTo - chipsFrom}
          inset={chipsFrom}
          onToggle={chips.toggle}
          menuFor={(id, index) =>
            effectChipMenu(
              chips.items[index]?.enabled ?? true,
              index,
              chips.items.length,
              chips.actions(id),
              locked,
            )
          }
          onMore={() => select([clip.id])}
        />
      )}
      {silences?.map((span) => (
        <span
          key={span.start}
          {...stylex.props(
            styles.silence,
            styles.span(
              timeToX(span.start - clip.start, pps),
              Math.max(1, timeToX(span.end - span.start, pps)),
            ),
          )}
        />
      ))}
      {clip.type === "media" && clip.speed !== 1 && (
        <span {...stylex.props(styles.speed)}>{clip.speed}×</span>
      )}
      {width > 18 &&
        (["start", "end"] as const).map((edge) => (
          <span
            key={edge}
            title={`Drag to trim ${edge}`}
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
