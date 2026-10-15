import { parseAnnotations } from "../core/annotations";
import { createTextClip } from "../core/factories";
import { runScript } from "../core/script";
import {
  canPlace,
  fillScale,
  moveClips,
  pasteClips,
  placeClip,
  projectDuration,
  removeClips,
  splitAtTime,
  splitClip,
} from "../core/timeline";
import { trackFor } from "../core/tracks";
import type { Clip, Id, Project } from "../core/types";
import { editorStore } from "../store";
import { newId } from "./engine";
import { pause, seek, togglePlay } from "./playback";

const state = () => editorStore.getState();

export const MIN_PX_PER_SECOND = 2;
export const MAX_PX_PER_SECOND = 600;

export function stepFrames(frames: number) {
  pause();
  const { playhead, project } = state();
  const fps = project.settings.fps;
  seek((Math.round(playhead * fps) + frames) / fps);
}

export function stepSeconds(seconds: number) {
  seek(state().playhead + seconds);
}

export const goToStart = () => seek(0);
export const goToEnd = () => seek(projectDuration(state().project));

export function splitAtPlayhead() {
  const { playhead, selection, commit } = state();
  commit((p) => splitAtTime(p, playhead, newId, selection.length > 0 ? selection : undefined));
}

export function deleteSelection(ripple = false) {
  const { selection, commit, project } = state();
  const locked = new Set(project.tracks.filter((t) => t.locked).map((t) => t.id));
  const ids = selection.filter((id) => {
    const clip = project.clips[id];
    return clip && !locked.has(clip.trackId);
  });
  if (ids.length) commit((p) => removeClips(p, ids, { ripple }));
}

export function addText(text = "Your title") {
  const id = newId();
  state().commit((p) => {
    const { project, trackId } = trackFor(p, "text", newId);
    return placeClip(
      project,
      createTextClip({ id, trackId, start: state().playhead, text }),
      newId,
    );
  });
  state().select([id]);
}

export const addMarker = () => addMarkerAt(state().playhead);

export function updateClip(id: Id, fn: (clip: Clip) => Clip, coalesce?: string) {
  state().commit(
    (p: Project) => {
      const clip = p.clips[id];
      return clip ? { ...p, clips: { ...p.clips, [id]: fn(clip) } } : p;
    },
    { coalesce },
  );
}

export function selectAll() {
  state().select(Object.keys(state().project.clips));
}

export function zoomBy(factor: number) {
  const { pxPerSecond, setView } = state();
  setView({
    pxPerSecond: Math.min(MAX_PX_PER_SECOND, Math.max(MIN_PX_PER_SECOND, pxPerSecond * factor)),
  });
}

/** Fits the whole project into `width` pixels of timeline. */
export function zoomToFit(width: number) {
  const duration = Math.max(5, projectDuration(state().project));
  state().setView({
    pxPerSecond: Math.min(MAX_PX_PER_SECOND, Math.max(MIN_PX_PER_SECOND, (width - 40) / duration)),
  });
}

type Shortcut = () => void;

/** Keyed by modifiers + KeyboardEvent.code; "Mod" is ⌘ on macOS and Ctrl elsewhere. */
export const SHORTCUTS: Record<string, Shortcut> = {
  Space: togglePlay,
  KeyK: pause,
  ArrowLeft: () => stepFrames(-1),
  ArrowRight: () => stepFrames(1),
  "Shift+ArrowLeft": () => stepSeconds(-1),
  "Shift+ArrowRight": () => stepSeconds(1),
  Home: goToStart,
  End: goToEnd,
  KeyS: splitAtPlayhead,
  "Mod+KeyB": splitAtPlayhead,
  Backspace: () => deleteSelection(),
  Delete: () => deleteSelection(),
  "Shift+Backspace": () => deleteSelection(true),
  "Shift+Delete": () => deleteSelection(true),
  "Mod+KeyZ": () => state().undo(),
  "Mod+Shift+KeyZ": () => state().redo(),
  "Mod+KeyY": () => state().redo(),
  "Mod+KeyA": selectAll,
  Escape: () => state().select([]),
  KeyV: () => state().setView({ tool: "select" }),
  KeyB: () => state().setView({ tool: "blade" }),
  KeyN: () => state().setView({ snapping: !state().snapping }),
  KeyL: () => state().setView({ loop: !state().loop }),
  KeyM: addMarker,
  "Mod+KeyC": copySelection,
  "Mod+KeyV": pasteAtPlayhead,
  "Mod+KeyD": duplicateSelection,
  KeyT: () => addText(),
  Equal: () => zoomBy(1.25),
  Minus: () => zoomBy(0.8),
};

const isMac = navigator.platform.toLowerCase().includes("mac");

export function shortcutKey(event: KeyboardEvent): string {
  const mod = isMac ? event.metaKey : event.ctrlKey;
  return [mod && "Mod", event.shiftKey && "Shift", event.altKey && "Alt", event.code]
    .filter(Boolean)
    .join("+");
}

const NON_TEXT_INPUTS = new Set(["range", "checkbox", "radio", "button", "color", "file"]);

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type)));

/** Editor shortcuts stand down while a modal dialog is visible (it owns the keyboard). */
const modalOpen = () =>
  [...document.querySelectorAll('[aria-modal="true"]')].some((el) => el.checkVisibility());

export function installShortcuts(): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (isEditable(event.target) || modalOpen()) return;
    const run = SHORTCUTS[shortcutKey(event)];
    if (!run) return;
    event.preventDefault();
    run();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

/** Adds one marker per parsed annotation (issue #4); returns how many were added. */
export async function importMarkers(file: File): Promise<number> {
  const annotations = parseAnnotations(await file.text());
  if (annotations.length === 0) throw new Error(`No timestamps found in ${file.name}`);
  state().commit((p) => ({
    ...p,
    markers: [...p.markers, ...annotations.map((a) => ({ id: newId(), ...a }))].sort(
      (a, b) => a.time - b.time,
    ),
  }));
  return annotations.length;
}

export async function runTimelineScript(code: string) {
  const result = await runScript(state().project, code, newId);
  if (!result.error) state().commit(() => result.project);
  return result;
}

let clipboard: Clip[] = [];

export function copySelection() {
  const { project, selection } = state();
  clipboard = selection.flatMap((id) => project.clips[id] ?? []);
}

function pasteAt(at: number, clips: readonly Clip[]) {
  if (clips.length === 0) return;
  let pasted: Id[] = [];
  state().commit((p) => {
    const result = pasteClips(p, clips, at, newId);
    pasted = result.ids;
    return result.project;
  });
  state().select(pasted);
}

export function pasteAtPlayhead() {
  pasteAt(state().playhead, clipboard);
}
export const hasClipboard = () => clipboard.length > 0;

/** Copies the selection to just after its last clip. */
export function duplicateSelection() {
  const { project, selection } = state();
  const clips = selection.flatMap((id) => project.clips[id] ?? []);
  if (clips.length === 0) return;
  pasteAt(Math.max(...clips.map((c) => c.start + c.duration)), clips);
}

export function splitClipAt(id: Id, time: number) {
  const fps = state().project.settings.fps;
  state().commit((p) => splitClip(p, id, Math.round(time * fps) / fps, newId));
}

export function fitClip(id: Id, mode: "fit" | "fill") {
  updateClip(id, (c) => ({
    ...c,
    transform: {
      ...c.transform,
      x: 0,
      y: 0,
      scale: mode === "fit" ? 1 : fillScale(state().project, c),
    },
  }));
}

export const resetTransform = (id: Id) =>
  updateClip(id, (c) => ({ ...c, transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 } }));

export function moveClipToPlayhead(id: Id) {
  const clip = state().project.clips[id];
  if (clip)
    state().commit((p) =>
      moveClips(p, [{ id, start: state().playhead, trackId: clip.trackId }], newId),
    );
}

export function addTextAt(start: number, trackId?: Id) {
  const id = newId();
  state().commit((p) => {
    const target =
      trackId && canPlace(p, "text", trackId)
        ? { project: p, trackId }
        : trackFor(p, "text", newId);
    return placeClip(
      target.project,
      createTextClip({ id, trackId: target.trackId, start, text: "Your title" }),
      newId,
    );
  });
  state().select([id]);
}

export function addMarkerAt(time: number) {
  state().commit((p) =>
    p.markers.some((m) => Math.abs(m.time - time) < 1e-3)
      ? p
      : {
          ...p,
          markers: [...p.markers, { id: newId(), time, label: "" }].sort((a, b) => a.time - b.time),
        },
  );
}

export function toggleTrack(trackId: Id, flag: "muted" | "solo" | "hidden" | "locked") {
  state().commit((p) => ({
    ...p,
    tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, [flag]: !t[flag] } : t)),
  }));
}
