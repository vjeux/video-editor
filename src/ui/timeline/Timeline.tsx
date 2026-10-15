import * as stylex from "@stylexjs/stylex";
import { clipMenu, laneMenu, openMenu } from "../../app/menus";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { addAssetToTimeline, importFiles } from "../../app/assets";
import { isProjectFile, openFiles } from "../../app/project-files";
import { reportError } from "../../app/errors";
import { MAX_PX_PER_SECOND, MIN_PX_PER_SECOND } from "../../app/commands";
import { applyEffect, applyTransition } from "../../app/effects";
import { newId } from "../../app/engine";
import { pause, seek } from "../../app/playback";
import type { Cut } from "../../core/effects";
import { timeToX, xToTime } from "../../core/layout";
import { snapToFrame } from "../../core/time";
import {
  canPlace,
  clipEnd,
  clipKind,
  moveClips,
  projectDuration,
  splitClip,
  trimClip,
} from "../../core/timeline";
import type { Clip, Id, Project } from "../../core/types";
import { editorStore, useEditor } from "../../store";
import { EFFECT_MIME } from "../effect-dnd";
import { ASSET_MIME } from "../media/dnd";
import { Icon } from "../controls/Icon";
import { colors } from "../theme/tokens.stylex";
import type { ClipEdge } from "./ClipView";
import { CUT_REACH_PX, cutTarget, effectDragKind, effectTargets } from "./effect-drop";
import { Lane } from "./Lane";
import { RULER_HEIGHT, type Viewport } from "./lanes";
import { Playhead } from "./Playhead";
import { pointerDrag } from "./pointer-drag";
import { Ruler } from "./Ruler";
import { snap, trackAtY } from "./snapping";
import { TimelineToolbar } from "./TimelineToolbar";
import { TrackHeaders } from "./TrackHeaders";

const TAIL_SECONDS = 30;

type Drag =
  | { kind: "move"; preview: Project; snapAt: number | null; valid: boolean; ids: Id[] }
  | { kind: "trim"; preview: Project; snapAt: number | null; ids: Id[] }
  | { kind: "drop"; trackId: Id | null; valid: boolean; time: number }
  | { kind: "effect"; trackId: Id | null; ids: Id[] }
  | { kind: "transition"; trackId: Id | null; cut: Cut | null };

const state = () => editorStore.getState();

const styles = stylex.create({
  root: {
    height: "100%",
    minHeight: 0,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: colors.panel,
  },
  body: {
    flexGrow: 1,
    minHeight: 0,
    display: "flex",
    overflow: "hidden",
  },
  lanes: {
    position: "relative",
    flexGrow: 1,
    minWidth: 0,
    overflow: "auto",
    backgroundColor: colors.lanes,
  },
  inner: {
    position: "relative",
    minHeight: "100%",
  },
  innerWidth: (width: number) => ({ width }),
  at: (left: number) => ({ left }),
  markerLine: {
    position: "absolute",
    top: 28,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(227, 166, 59, 0.25)",
    pointerEvents: "none",
  },
  snapLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.accent2,
    zIndex: 8,
    pointerEvents: "none",
    boxShadow: `0 0 6px ${colors.accent}`,
  },
  bladeLine: {
    position: "absolute",
    top: 28,
    bottom: 0,
    width: 1,
    backgroundColor: "#fff",
    zIndex: 8,
    pointerEvents: "none",
  },
  empty: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 28,
    bottom: 0,
    display: "grid",
    placeItems: "center",
    color: colors.faint,
    pointerEvents: "none",
    fontSize: 12,
    padding: 20,
    textAlign: "center",
  },
  emptyContent: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  emptyTitle: { color: colors.muted, fontWeight: 500 },
});

export function Timeline() {
  const project = useEditor((s) => s.project);
  const pps = useEditor((s) => s.pxPerSecond);
  const tool = useEditor((s) => s.tool);
  const commit = useEditor((s) => s.commit);
  const select = useEditor((s) => s.select);
  const scroller = useRef<HTMLDivElement>(null);
  const heads = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<Viewport>({ left: 0, width: 1000 });
  const [drag, setDrag] = useState<Drag | null>(null);
  const [blade, setBlade] = useState<number | null>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => {
      setView({ left: el.scrollLeft, width: el.clientWidth });
      if (heads.current) heads.current.scrollTop = el.scrollTop;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const { pxPerSecond, setView: setEditorView } = state();
      const pointerX = e.clientX - rect.left;
      const time = (el.scrollLeft + pointerX) / pxPerSecond;
      const next = Math.min(
        MAX_PX_PER_SECOND,
        Math.max(MIN_PX_PER_SECOND, pxPerSecond * Math.exp(-e.deltaY * 0.01)),
      );
      setEditorView({ pxPerSecond: next });
      requestAnimationFrame(() => (el.scrollLeft = time * next - pointerX));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    // Page the view along with the playhead during playback.
    const unfollow = editorStore.subscribe(({ playing, playhead, pxPerSecond }) => {
      const x = timeToX(playhead, pxPerSecond);
      if (playing && (x > el.scrollLeft + el.clientWidth - 40 || x < el.scrollLeft)) {
        el.scrollLeft = Math.max(0, x - 40);
      }
    });
    return () => {
      unfollow();
      observer.disconnect();
      el.removeEventListener("scroll", update);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const preview = drag?.kind === "move" || drag?.kind === "trim" ? drag : null;
  const shown = preview?.preview ?? project;
  const duration = projectDuration(shown);
  const innerWidth = Math.max(view.width, timeToX(duration + TAIL_SECONDS, pps));

  const localPoint = (e: { clientX: number; clientY: number }) => {
    const el = scroller.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left + el.scrollLeft, y: e.clientY - rect.top + el.scrollTop };
  };

  const scrub = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    pause();
    const at = (ev: { clientX: number; clientY: number }) => {
      const t = xToTime(localPoint(ev).x, state().pxPerSecond);
      const snapped = snap(state().project, t, []);
      seek(snapToFrame(snapped.time, state().project.settings.fps));
    };
    at(e);
    pointerDrag(e, at, () => undefined);
  };

  const onClipPointerDown = (e: ReactPointerEvent, clip: Clip, edge: ClipEdge | null) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const base = state().project;
    const fps = base.settings.fps;
    const locked = base.tracks.find((t) => t.id === clip.trackId)?.locked;

    if (state().tool === "blade" && !edge) {
      const t = snap(base, xToTime(localPoint(e).x, state().pxPerSecond), [clip.id]).time;
      commit((p) => splitClip(p, clip.id, snapToFrame(t, fps), newId));
      return;
    }

    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    const current = state().selection;
    if (additive) {
      select(
        current.includes(clip.id) ? current.filter((id) => id !== clip.id) : [...current, clip.id],
      );
      return;
    }
    const ids = current.includes(clip.id) ? current : [clip.id];
    if (!current.includes(clip.id)) select([clip.id]);
    if (locked) return;

    const origin = localPoint(e);
    // The commit re-applies the exact op that produced the last preview (WYSIWYG).
    let final: ((p: Project) => Project) | null = null;
    const finish = (moved: boolean) => {
      setDrag(null);
      if (moved && final) commit(final);
    };

    if (edge) {
      const raw = edge === "start" ? clip.start : clipEnd(clip);
      pointerDrag(
        e,
        (ev) => {
          const t0 = raw + (localPoint(ev).x - origin.x) / state().pxPerSecond;
          const snapped = snap(base, t0, [clip.id]);
          const t = snapToFrame(snapped.time, fps);
          final = (p) => trimClip(p, clip.id, edge, t);
          setDrag({ kind: "trim", preview: final(base), snapAt: snapped.snapAt, ids: [clip.id] });
        },
        finish,
      );
      return;
    }

    const movable = ids.filter((id) => {
      const c = base.clips[id];
      return c && !base.tracks.find((t) => t.id === c.trackId)?.locked;
    });
    pointerDrag(
      e,
      (ev) => {
        const point = localPoint(ev);
        const delta = (point.x - origin.x) / state().pxPerSecond;
        const snapped = snap(base, clip.start + delta, movable, clip.duration);
        const shift = snapToFrame(snapped.time, fps) - clip.start;
        const minStart = Math.min(...movable.map((id) => base.clips[id]?.start ?? 0));
        const clamped = Math.max(shift, -minStart);
        const hovered = trackAtY(base, point.y);
        const targetTrack =
          movable.length === 1 && hovered && canPlace(base, clipKind(base, clip), hovered.id)
            ? hovered.id
            : clip.trackId;
        const moves = movable.map((id) => {
          const c = base.clips[id] as Clip;
          return {
            id,
            start: c.start + clamped,
            trackId: id === clip.id ? targetTrack : c.trackId,
          };
        });
        const valid =
          movable.length > 0 && (!hovered || movable.length > 1 || targetTrack === hovered.id);
        final = (p) => moveClips(p, moves, newId);
        setDrag({
          kind: "move",
          preview: final(base),
          snapAt: snapped.snapAt,
          valid,
          ids: movable,
        });
      },
      finish,
    );
  };

  const onLanePointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    select([]);
    scrub(e);
  };

  const dropTarget = (e: DragEvent) => {
    const point = localPoint(e);
    const target = trackAtY(project, point.y);
    const t = snap(project, xToTime(point.x, pps), []).time;
    return { target, time: snapToFrame(t, project.settings.fps) };
  };

  const libraryDragOver = (e: DragEvent, kind: "effect" | "transition") => {
    const point = localPoint(e);
    const track = trackAtY(project, point.y);
    const time = xToTime(point.x, pps);
    const next: Drag =
      kind === "effect"
        ? {
            kind,
            trackId: track?.id ?? null,
            ids: effectTargets(project, track, time, state().selection),
          }
        : {
            kind,
            trackId: track?.id ?? null,
            cut: cutTarget(project, track, time, CUT_REACH_PX / pps),
          };
    const valid = next.kind === "effect" ? next.ids.length > 0 : next.cut !== null;
    e.dataTransfer.dropEffect = valid ? "copy" : "none";
    setDrag(next);
  };

  const onDragOver = (e: DragEvent) => {
    const types = e.dataTransfer.types;
    const library = effectDragKind(types);
    const isAsset = types.includes(ASSET_MIME);
    const isFiles = types.includes("Files");
    if (!library && !isAsset && !isFiles) return;
    e.preventDefault();
    e.stopPropagation();
    if (library) {
      libraryDragOver(e, library);
      return;
    }
    const { target, time } = dropTarget(e);
    setDrag({ kind: "drop", trackId: target?.id ?? null, valid: !target?.locked, time });
  };

  // Library drops land exactly on what the dragover indicated (WYSIWYG).
  const dropLibrary = (effectId: string) => {
    if (drag?.kind === "effect" && drag.ids.length) applyEffect(effectId, drag.ids);
    if (drag?.kind === "transition" && drag.cut) applyTransition(drag.cut.toId, effectId);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(null);
    const effectId = e.dataTransfer.getData(EFFECT_MIME);
    if (effectId) {
      dropLibrary(effectId);
      return;
    }
    const { target, time } = dropTarget(e);
    if (target?.locked) return;
    const assetId = e.dataTransfer.getData(ASSET_MIME);
    if (assetId) addAssetToTimeline(assetId, { trackId: target?.id, start: time });
    else if (e.dataTransfer.files.length) {
      const files = [...e.dataTransfer.files];
      if (files.some(isProjectFile)) void openFiles(files).catch(reportError);
      else void importFiles(files, { trackId: target?.id, start: time });
    }
  };

  const dragIds = preview?.ids ?? [];
  const snapAt = preview?.snapAt ?? null;
  const invalidMove = drag?.kind === "move" && !drag.valid;
  const dropOn = (trackId: Id) => {
    if (drag?.kind === "drop" && drag.trackId === trackId) return drag.valid ? "ok" : "bad";
    if (drag?.kind === "effect" && drag.trackId === trackId && !drag.ids.length) return "bad";
    if (drag?.kind === "transition" && drag.trackId === trackId && !drag.cut) return "bad";
    return null;
  };
  const effectDropIds = drag?.kind === "effect" ? drag.ids : [];
  const cutAt = (trackId: Id) =>
    drag?.kind === "transition" && drag.trackId === trackId ? (drag.cut?.time ?? null) : null;

  return (
    <section id="timeline-panel" aria-label="Timeline" {...stylex.props(styles.root)}>
      <TimelineToolbar width={view.width} />
      <div {...stylex.props(styles.body)}>
        <TrackHeaders scrollRef={heads} />
        <div
          ref={scroller}
          {...stylex.props(styles.lanes)}
          onDragOver={onDragOver}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(null);
          }}
          onDrop={onDrop}
          onPointerMove={(e) => {
            if (tool === "blade") setBlade(snap(project, xToTime(localPoint(e).x, pps), []).time);
          }}
          onPointerLeave={() => setBlade(null)}
          onContextMenu={(e) => {
            const point = localPoint(e);
            const time = snapToFrame(xToTime(point.x, pps), project.settings.fps);
            const clipId = (e.target as Element).closest<HTMLElement>("[data-clip]")?.dataset.clip;
            if (clipId) openMenu(e, clipMenu(clipId, time));
            const overRuler =
              e.clientY - e.currentTarget.getBoundingClientRect().top < RULER_HEIGHT;
            if (!clipId && !overRuler)
              openMenu(e, laneMenu(trackAtY(project, point.y)?.id ?? null, time));
          }}
        >
          <div {...stylex.props(styles.inner, styles.innerWidth(innerWidth))}>
            <Ruler view={view} duration={duration} onScrub={scrub} />
            {shown.tracks.map((t, i) => (
              <Lane
                key={t.id}
                track={t}
                project={shown}
                striped={i % 2 === 1}
                dragIds={dragIds}
                invalid={invalidMove}
                drop={dropOn(t.id)}
                effectTargets={effectDropIds}
                cutAt={cutAt(t.id)}
                view={view}
                onPointerDown={onLanePointerDown}
                onClipPointerDown={onClipPointerDown}
              />
            ))}
            {project.markers.map((m) => (
              <div
                key={m.id}
                {...stylex.props(styles.markerLine, styles.at(timeToX(m.time, pps)))}
              />
            ))}
            {snapAt !== null && (
              <div {...stylex.props(styles.snapLine, styles.at(timeToX(snapAt, pps)))} />
            )}
            {drag?.kind === "drop" && (
              <div {...stylex.props(styles.snapLine, styles.at(timeToX(drag.time, pps)))} />
            )}
            {tool === "blade" && blade !== null && (
              <div {...stylex.props(styles.bladeLine, styles.at(timeToX(blade, pps)))} />
            )}
            <Playhead />
          </div>
          {Object.keys(project.clips).length === 0 && !drag && (
            <div {...stylex.props(styles.empty)}>
              <div {...stylex.props(styles.emptyContent)}>
                <Icon name="track" size={24} />
                <span {...stylex.props(styles.emptyTitle)}>Make room for your first clip</span>
                <span>Drag media here, or press T to add a title.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
