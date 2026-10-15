import * as stylex from "@stylexjs/stylex";
import { clipMenu, openMenu } from "../../app/menus";
import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { updateClip } from "../../app/commands";
import { visualLayers } from "../../core/timeline";
import type { Clip, Transform } from "../../core/types";
import { useEditor } from "../../store";
import { useGestureKey } from "../gesture";
import { colors, fonts } from "../theme/tokens.stylex";
import { InlineTextEditor } from "./InlineTextEditor";
import { useFontsVersion } from "./use-fonts-version";
import { boxOf, contains, rotateAbout, scaleAbout, snapOffset, type Point } from "./layer-box";

const SNAP_PX = 12;

type Mode = "move" | "scale" | "rotate";

const handle = {
  position: "absolute",
  width: 24,
  height: 24,
  padding: 0,
  display: "grid",
  placeItems: "center",
  boxSizing: "border-box",
  borderWidth: 0,
  backgroundColor: "transparent",
  transform: "translate(-50%, -50%)",
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
    // Drawn as shadows so handles sit exactly on the edges: a 1px accent
    // outline plus a dark halo that reads on bright and dark footage.
    boxShadow: `0 0 0 1px ${colors.accent2}, 0 0 0 2px rgba(0, 0, 0, 0.45)`,
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
  corner: { ...handle, borderRadius: 4 },
  point: {
    width: 9,
    height: 9,
    borderRadius: 2,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.accent,
    backgroundColor: "#fff",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
    transform: {
      default: "scale(1)",
      [stylex.when.ancestor(":hover")]: "scale(1.2)",
      [stylex.when.ancestor(":focus-visible")]: "scale(1.2)",
    },
    transition: "transform 120ms ease",
    pointerEvents: "none",
  },
  nw: { left: 0, top: 0, cursor: "nwse-resize" },
  ne: { left: "100%", top: 0, cursor: "nesw-resize" },
  sw: { left: 0, top: "100%", cursor: "nesw-resize" },
  se: { left: "100%", top: "100%", cursor: "nwse-resize" },
  stem: {
    position: "absolute",
    left: "50%",
    bottom: "100%",
    width: 1,
    height: 30,
    transform: "translateX(-50%)",
    backgroundColor: colors.accent2,
    boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.3)",
    pointerEvents: "none",
  },
  rotate: {
    ...handle,
    left: "50%",
    top: -30,
    width: 28,
    height: 28,
    borderRadius: "50%",
    color: colors.text,
    backgroundColor: { default: colors.panel2, ":hover": colors.accent },
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.accent2,
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.35)",
    transition: "background-color 120ms ease",
    cursor: { default: "grab", ":active": "grabbing" },
  },
  readout: {
    position: "absolute",
    left: "50%",
    top: "calc(100% + 16px)",
    transform: "translateX(-50%)",
    paddingBlock: 4,
    paddingInline: 8,
    borderRadius: 4,
    backgroundColor: "rgba(20, 23, 30, 0.95)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line2,
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 11,
    whiteSpace: "nowrap",
    pointerEvents: "none",
  },
  upright: (rotation: number) => ({ transform: `translateX(-50%) rotate(${-rotation}deg)` }),
});

const CORNERS = [
  ["top left", styles.nw],
  ["top right", styles.ne],
  ["bottom left", styles.sw],
  ["bottom right", styles.se],
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
  const [dragging, setDragging] = useState<Mode | null>(null);
  const project = useEditor((s) => s.project);
  const fontsVersion = useFontsVersion();
  const playhead = useEditor((s) => s.playhead);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const editingText = useEditor((s) => s.editingText);
  const editText = useEditor((s) => s.editText);
  const gesture = useGestureKey("viewer");
  const layers = visualLayers(project, playhead);
  const selected = layers.find((c) => selection.length === 1 && c.id === selection[0]);
  const box = selected ? boxOf(project, selected, fontsVersion) : null;
  const isLocked = (clip: Clip) =>
    project.tracks.find((t) => t.id === clip.trackId)?.locked ?? false;

  const toProject = (clientX: number, clientY: number): Point | null => {
    const rect = overlay.current?.getBoundingClientRect();
    return rect ? { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale } : null;
  };

  const hitAt = (clientX: number, clientY: number) => {
    const p = toProject(clientX, clientY);
    return (
      p &&
      layers.toReversed().find((clip) => {
        const b = boxOf(project, clip, fontsVersion);
        return b && contains(b, p.x, p.y);
      })
    );
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
    setDragging(mode);
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
      setDragging(null);
      gesture.renew();
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  const locked = selected ? isLocked(selected) : false;
  const editing = selected?.type === "text" && selected.id === editingText ? selected : null;
  const handleKey = (e: KeyboardEvent<HTMLButtonElement>, mode: "scale" | "rotate") => {
    if (e.metaKey || e.ctrlKey) return;
    e.stopPropagation();
    if (!selected) return;
    const direction = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (!direction) return;
    e.preventDefault();
    const t = selected.transform;
    const patch =
      mode === "scale"
        ? { scale: Math.max(0.05, Math.min(8, t.scale + direction * (e.shiftKey ? 0.1 : 0.01))) }
        : {
            rotation:
              ((((t.rotation + direction * (e.shiftKey ? 15 : 1) + 180) % 360) + 360) % 360) - 180,
          };
    updateClip(
      selected.id,
      (c) => ({ ...c, transform: { ...c.transform, ...patch } }),
      gesture.key,
    );
  };

  return (
    <div
      ref={overlay}
      onPointerDown={(e) => {
        const hit = hitAt(e.clientX, e.clientY);
        select(hit ? [hit.id] : []);
        if (hit && e.button === 0) startDrag(e, hit, "move");
      }}
      onDoubleClick={(e) => {
        const hit = hitAt(e.clientX, e.clientY);
        if (hit?.type === "text" && !isLocked(hit)) editText(hit.id);
      }}
      onContextMenu={(e) => {
        const hit = hitAt(e.clientX, e.clientY);
        if (hit) openMenu(e, clipMenu(hit.id, playhead));
        else e.preventDefault();
      }}
      {...stylex.props(styles.overlay, styles.rect(left, top, width, height))}
    >
      {selected && box && (
        <div
          // Body clicks bubble to the overlay so selection never hides a layer above it.
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
                <button
                  key={name}
                  type="button"
                  aria-label={`Resize ${name}`}
                  title="Drag to resize · Shift to snap · Arrow keys to adjust"
                  onPointerDown={(e) => startDrag(e, selected, "scale")}
                  onKeyDown={(e) => handleKey(e, "scale")}
                  onKeyUp={() => gesture.renew()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  {...stylex.props(styles.corner, corner, stylex.defaultMarker())}
                >
                  <span {...stylex.props(styles.point)} />
                </button>
              ))}
              <div {...stylex.props(styles.stem)} />
              <button
                type="button"
                aria-label="Rotate layer"
                title="Drag to rotate · Shift snaps to 15° · Arrow keys to adjust"
                onPointerDown={(e) => startDrag(e, selected, "rotate")}
                onKeyDown={(e) => handleKey(e, "rotate")}
                onKeyUp={() => gesture.renew()}
                onDoubleClick={(e) => e.stopPropagation()}
                {...stylex.props(styles.rotate)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20 7v5h-5M19.1 7.5a8 8 0 1 0 .4 8" />
                </svg>
              </button>
              {dragging && (
                <div {...stylex.props(styles.readout, styles.upright(box.rotation))}>
                  {dragging === "rotate"
                    ? `${selected.transform.rotation.toFixed(1)}°`
                    : dragging === "scale"
                      ? `${Math.round(selected.transform.scale * 100)}%`
                      : `${Math.round(selected.transform.x)}, ${Math.round(selected.transform.y)}`}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {editing && box && <InlineTextEditor clip={editing} box={box} scale={scale} />}
    </div>
  );
}
