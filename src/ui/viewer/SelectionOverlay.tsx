import * as stylex from "@stylexjs/stylex";
import { clipMenu, openMenu } from "../../app/menus";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { updateClip } from "../../app/commands";
import { visualLayers } from "../../core/timeline";
import type { Clip, Transform } from "../../core/types";
import { useEditor } from "../../store";
import { useGestureKey } from "../gesture";
import { colors } from "../theme/tokens.stylex";
import { InlineTextEditor } from "./InlineTextEditor";
import { useFontsVersion } from "./use-fonts-version";
import { boxOf, contains, rotateAbout, scaleAbout, snapOffset, type Point } from "./layer-box";

const SNAP_PX = 12;

type Mode = "move" | "scale" | "rotate";

const handle = {
  position: "absolute",
  width: 12,
  height: 12,
  boxSizing: "border-box",
  borderWidth: 1.5,
  borderStyle: "solid",
  borderColor: colors.accent,
  backgroundColor: "#fff",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.5)",
  transform: {
    default: "translate(-50%, -50%)",
    ":hover": "translate(-50%, -50%) scale(1.25)",
    ":active": "translate(-50%, -50%) scale(1.25)",
  },
  transition: "transform 120ms ease",
  touchAction: "none",
} as const;

const styles = stylex.create({
  overlay: {
    position: "absolute",
    overflow: "visible",
    touchAction: "none",
  },
  rect: (left: number, top: number, width: number, height: number) => ({
    left,
    top,
    width,
    height,
  }),
  box: {
    position: "absolute",
    // Drawn as shadows so handles sit exactly on the edges: a 1.5px accent
    // outline plus a dark halo that reads on bright and dark footage.
    boxShadow: `0 0 0 1.5px ${colors.accent2}, 0 0 0 2.5px rgba(0, 0, 0, 0.45)`,
    cursor: "move",
    touchAction: "none",
  },
  locked: { cursor: "default" },
  placed: (left: number, top: number, width: number, height: number, transform: string) => ({
    left,
    top,
    width,
    height,
    transform,
  }),
  corner: { ...handle, borderRadius: "50%" },
  nw: { left: 0, top: 0, cursor: "nwse-resize" },
  ne: { left: "100%", top: 0, cursor: "nesw-resize" },
  sw: { left: 0, top: "100%", cursor: "nesw-resize" },
  se: { left: "100%", top: "100%", cursor: "nwse-resize" },
  stem: {
    position: "absolute",
    left: "50%",
    bottom: "100%",
    width: 1,
    height: 18,
    transform: "translateX(-50%)",
    backgroundColor: colors.accent2,
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.3)",
    pointerEvents: "none",
  },
  rotate: {
    ...handle,
    left: "50%",
    top: -24,
    borderRadius: "50%",
    cursor: { default: "grab", ":active": "grabbing" },
  },
});

const CORNERS = [
  ["nw", styles.nw],
  ["ne", styles.ne],
  ["sw", styles.sw],
  ["se", styles.se],
] as const;

/**
 * Click-to-select, drag-to-move, corner-to-scale and handle-to-rotate for the
 * selected visual layer. Positioned over the frame rect but never clipped by it.
 */
export function SelectionOverlay({
  left,
  top,
  width,
  height,
  scale,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Displayed pixels per project pixel. */
  scale: number;
}) {
  const overlay = useRef<HTMLDivElement>(null);
  const project = useEditor((s) => s.project);
  const fontsVersion = useFontsVersion();
  const playhead = useEditor((s) => s.playhead);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const editingText = useEditor((s) => s.editingText);
  const editText = useEditor((s) => s.editText);
  const gesture = useGestureKey("viewer");
  const playing = useEditor((s) => s.playing);
  // During playback the box would chase every frame (measuring titles each
  // time) and cannot be dragged anyway: it reappears on pause.
  const layers = playing ? [] : visualLayers(project, playhead);
  const selected = layers.find((c) => selection.length === 1 && c.id === selection[0]);
  const box = selected ? boxOf(project, selected, fontsVersion) : null;
  const isLocked = (clip: Clip) =>
    project.tracks.find((t) => t.id === clip.trackId)?.locked ?? false;

  const toProject = (clientX: number, clientY: number): Point | null => {
    const rect = overlay.current?.getBoundingClientRect();
    return rect ? { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale } : null;
  };

  const next = (
    mode: Mode,
    clip: Clip,
    origin: Point,
    p: Point,
    ev: PointerEvent,
  ): Partial<Transform> => {
    const start = clip.transform;
    const b = boxOf(project, clip, fontsVersion);
    if (mode === "scale" && b) return { scale: scaleAbout(b, start.scale, origin, p, ev.shiftKey) };
    if (mode === "rotate" && b)
      return { rotation: rotateAbout(b, start.rotation, origin, p, ev.shiftKey) };
    const moved = { x: start.x + p.x - origin.x, y: start.y + p.y - origin.y };
    const snapped = ev.altKey ? moved : snapOffset(moved, b, project.settings, SNAP_PX / scale);
    return { x: Math.round(snapped.x), y: Math.round(snapped.y) };
  };

  const startDrag = (e: ReactPointerEvent<HTMLElement>, clip: Clip, mode: Mode) => {
    if (isLocked(clip) || e.button !== 0) return;
    e.stopPropagation();
    const origin = toProject(e.clientX, e.clientY);
    if (!origin) return;
    const key = gesture.key;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      const p = toProject(ev.clientX, ev.clientY);
      if (!p) return;
      const patch = next(mode, clip, origin, p, ev);
      updateClip(clip.id, (c) => ({ ...c, transform: { ...c.transform, ...patch } }), key);
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
      gesture.renew();
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  const locked = selected ? isLocked(selected) : false;
  const editing = selected?.type === "text" && selected.id === editingText ? selected : null;

  return (
    <div
      ref={overlay}
      onPointerDown={(e) => {
        const p = toProject(e.clientX, e.clientY);
        if (!p) return;
        const hit = visualLayers(project, playhead)
          .toReversed()
          .find((clip) => {
            const b = boxOf(project, clip, fontsVersion);
            return b && contains(b, p.x, p.y);
          });
        select(hit ? [hit.id] : []);
        if (hit && e.button === 0) startDrag(e, hit, "move");
      }}
      onContextMenu={(e) => {
        const p = toProject(e.clientX, e.clientY);
        const hit =
          p &&
          visualLayers(project, playhead)
            .toReversed()
            .find((clip) => {
              const b = boxOf(project, clip, fontsVersion);
              return b && contains(b, p.x, p.y);
            });
        if (hit) openMenu(e, clipMenu(hit.id, playhead));
        else e.preventDefault();
      }}
      {...stylex.props(styles.overlay, styles.rect(left, top, width, height))}
    >
      {selected && box && (
        <div
          onPointerDown={(e) => !editing && startDrag(e, selected, "move")}
          onDoubleClick={() => selected.type === "text" && !locked && editText(selected.id)}
          {...stylex.props(
            styles.box,
            locked && styles.locked,
            styles.placed(
              (box.cx - box.width / 2) * scale,
              (box.cy - box.height / 2) * scale,
              box.width * scale,
              box.height * scale,
              `rotate(${box.rotation}deg)`,
            ),
          )}
        >
          {!locked && !editing && (
            <>
              {CORNERS.map(([name, corner]) => (
                <div
                  key={name}
                  onPointerDown={(e) => startDrag(e, selected, "scale")}
                  {...stylex.props(styles.corner, corner)}
                />
              ))}
              <div {...stylex.props(styles.stem)} />
              <div
                title="Rotate (Shift snaps to 15°)"
                onPointerDown={(e) => startDrag(e, selected, "rotate")}
                {...stylex.props(styles.rotate)}
              />
            </>
          )}
        </div>
      )}
      {editing && box && <InlineTextEditor clip={editing} box={box} scale={scale} />}
    </div>
  );
}
