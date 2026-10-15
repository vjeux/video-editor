import { addTrack } from "../core/tracks";
import { removeTrack } from "../core/tracks";
import type { Id, TrackKind } from "../core/types";
import { editorStore } from "../store";
import { contextMenuStore, type MenuEntry } from "../store/context-menu";
import { addAssetToTimeline, deleteAsset } from "./assets";
import {
  addMarkerAt,
  addTextAt,
  copySelection,
  deleteSelection,
  duplicateSelection,
  fitClip,
  hasClipboard,
  moveClipToPlayhead,
  pasteAtPlayhead,
  resetTransform,
  splitAtPlayhead,
  splitClipAt,
  toggleTrack,
} from "./commands";
import { newId } from "./engine";
import { seek } from "./playback";

const state = () => editorStore.getState();
const SEPARATOR: MenuEntry = { kind: "separator" };
const item = (
  label: string,
  run: () => void,
  extra: Partial<Extract<MenuEntry, { kind: "item" }>> = {},
): MenuEntry => ({
  kind: "item",
  label,
  run,
  ...extra,
});

/** Opens a menu at the pointer of a contextmenu event. */
export function openMenu(
  event: { clientX: number; clientY: number; preventDefault(): void },
  entries: MenuEntry[],
) {
  event.preventDefault();
  contextMenuStore.getState().open({ x: event.clientX, y: event.clientY, entries });
}

export function clipMenu(clipId: Id, time: number): MenuEntry[] {
  const { project, selection, select, playhead } = state();
  const clip = project.clips[clipId];
  if (!clip) return [];
  if (!selection.includes(clipId)) select([clipId]);
  const locked = project.tracks.find((t) => t.id === clip.trackId)?.locked ?? false;
  const inside = (t: number) => t > clip.start && t < clip.start + clip.duration;
  const visual = clip.type === "text" || project.assets[clip.assetId]?.kind !== "audio";
  return [
    item("Split here", () => splitClipAt(clipId, time), { disabled: locked || !inside(time) }),
    item("Split at playhead", splitAtPlayhead, {
      shortcut: "S",
      disabled: locked || !inside(playhead),
    }),
    SEPARATOR,
    item("Copy", copySelection, { shortcut: "⌘C" }),
    item("Duplicate", duplicateSelection, { shortcut: "⌘D", disabled: locked }),
    item("Move to playhead", () => moveClipToPlayhead(clipId), { disabled: locked }),
    ...(visual
      ? [
          SEPARATOR,
          item("Fit to frame", () => fitClip(clipId, "fit"), { disabled: locked }),
          ...(clip.type === "media"
            ? [item("Fill frame", () => fitClip(clipId, "fill"), { disabled: locked })]
            : []),
          item("Reset transform", () => resetTransform(clipId), { disabled: locked }),
        ]
      : []),
    SEPARATOR,
    item("Delete", () => deleteSelection(), { shortcut: "⌫", danger: true, disabled: locked }),
    item("Ripple delete", () => deleteSelection(true), {
      shortcut: "⇧⌫",
      danger: true,
      disabled: locked,
    }),
  ];
}

export function laneMenu(trackId: Id | null, time: number): MenuEntry[] {
  return [
    item(
      "Paste",
      () => {
        seek(time);
        pasteAtPlayhead();
      },
      { shortcut: "⌘V", disabled: !hasClipboard() },
    ),
    item("Add title here", () => addTextAt(time, trackId ?? undefined)),
    item("Add marker here", () => addMarkerAt(time)),
    item("Move playhead here", () => seek(time)),
  ];
}

const TRACK_KINDS: { kind: TrackKind; label: string }[] = [
  { kind: "video", label: "Add video track" },
  { kind: "audio", label: "Add audio track" },
  { kind: "text", label: "Add title track" },
];

export function trackMenu(trackId: Id): MenuEntry[] {
  const { project, commit } = state();
  const track = project.tracks.find((t) => t.id === trackId);
  if (!track) return [];
  const onlyOfKind = project.tracks.filter((t) => t.kind === track.kind).length === 1;
  const flags = [
    item(track.kind === "audio" ? "Mute" : "Mute audio", () => toggleTrack(trackId, "muted"), {
      checked: track.muted,
    }),
    ...(track.kind === "audio"
      ? [item("Solo", () => toggleTrack(trackId, "solo"), { checked: track.solo })]
      : [item("Hide", () => toggleTrack(trackId, "hidden"), { checked: track.hidden })]),
    item("Lock", () => toggleTrack(trackId, "locked"), { checked: track.locked }),
  ].filter((e) => !(track.kind === "text" && e.kind === "item" && e.label === "Mute audio"));
  return [
    ...flags,
    SEPARATOR,
    ...TRACK_KINDS.map(({ kind, label }) =>
      item(label, () => commit((p) => addTrack(p, kind, newId()).project)),
    ),
    SEPARATOR,
    item("Delete track", () => commit((p) => removeTrack(p, trackId)), {
      danger: true,
      disabled: onlyOfKind,
    }),
  ];
}

export function assetMenu(assetId: Id): MenuEntry[] {
  return [
    item("Append to timeline", () => addAssetToTimeline(assetId)),
    item("Insert at playhead", () => addAssetToTimeline(assetId, { start: state().playhead })),
    SEPARATOR,
    item("Remove from project", () => deleteAsset(assetId), { danger: true }),
  ];
}
