import { addTrack } from "../core/tracks";
import { removeTrack } from "../core/tracks";
import type { Id, TrackKind } from "../core/types";
import { editorStore } from "../store";
import { contextMenuStore, type MenuEntry } from "../store/context-menu";
import { previousAdjacent } from "../core/effects";
import { addAssetToTimeline, deleteAsset, freezeFrame } from "./assets";
import { reportError } from "./errors";
import { addAdjustmentLayer, applyTransition, findEffect } from "./effects";
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
  const visual = clip.type !== "media" || project.assets[clip.assetId]?.kind !== "audio";
  return [
    ...(clip.type === "text"
      ? [
          item("Edit text", () => state().editText(clipId), {
            icon: "text",
            shortcut: "Enter",
            disabled: locked,
          }),
          SEPARATOR,
        ]
      : []),
    item("Split here", () => splitClipAt(clipId, time), {
      icon: "split",
      disabled: locked || !inside(time),
    }),
    item("Split at playhead", splitAtPlayhead, {
      icon: "blade",
      shortcut: "S",
      disabled: locked || !inside(playhead),
    }),
    SEPARATOR,
    item("Copy", copySelection, { icon: "copy", shortcut: "⌘C" }),
    item("Duplicate", duplicateSelection, { icon: "duplicate", shortcut: "⌘D", disabled: locked }),
    item("Move to playhead", () => moveClipToPlayhead(clipId), {
      icon: "toPlayhead",
      disabled: locked,
    }),
    ...(visual
      ? [
          SEPARATOR,
          item("Fit to frame", () => fitClip(clipId, "fit"), { icon: "fit", disabled: locked }),
          ...(clip.type === "media"
            ? [
                item("Fill frame", () => fitClip(clipId, "fill"), {
                  icon: "fullscreen",
                  disabled: locked,
                }),
              ]
            : []),
          item("Reset transform", () => resetTransform(clipId), {
            icon: "reset",
            disabled: locked,
          }),
        ]
      : []),
    SEPARATOR,
    item("Crossfade from previous clip", () => applyTransition(clipId, "crossfade"), {
      icon: "transition",
      disabled: locked || !previousAdjacent(project, clip) || !findEffect("crossfade"),
    }),
    item("Add adjustment layer", () => addAdjustmentLayer(), { icon: "layers" }),
    item("Freeze frame at playhead", () => void freezeFrame().catch(reportError), {
      icon: "freeze",
      shortcut: "F",
      disabled:
        locked ||
        clip.type !== "media" ||
        project.assets[clip.assetId]?.kind !== "video" ||
        !inside(playhead),
    }),
    SEPARATOR,
    item("Delete", () => deleteSelection(), {
      icon: "trash",
      shortcut: "⌫",
      danger: true,
      disabled: locked,
    }),
    item("Ripple delete", () => deleteSelection(true), {
      icon: "ripple",
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
      { icon: "paste", shortcut: "⌘V", disabled: !hasClipboard() },
    ),
    item("Add title here", () => addTextAt(time, trackId ?? undefined), { icon: "text" }),
    item("Add marker here", () => addMarkerAt(time), { icon: "marker", shortcut: "M" }),
    item("Move playhead here", () => seek(time), { icon: "toPlayhead" }),
  ];
}

const TRACK_KINDS: { kind: TrackKind; label: string; icon: string }[] = [
  { kind: "video", label: "Video", icon: "film" },
  { kind: "audio", label: "Audio", icon: "music" },
  { kind: "text", label: "Title", icon: "text" },
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
    {
      kind: "submenu",
      label: "Add track",
      icon: "plus",
      entries: TRACK_KINDS.map(({ kind, label, icon }) =>
        item(label, () => commit((p) => addTrack(p, kind, newId()).project), { icon }),
      ),
    },
    SEPARATOR,
    item("Delete track", () => commit((p) => removeTrack(p, trackId)), {
      icon: "trash",
      danger: true,
      disabled: onlyOfKind,
    }),
  ];
}

export function assetMenu(assetId: Id): MenuEntry[] {
  return [
    item("Append to timeline", () => addAssetToTimeline(assetId), { icon: "plus" }),
    item("Insert at playhead", () => addAssetToTimeline(assetId, { start: state().playhead }), {
      icon: "toPlayhead",
    }),
    SEPARATOR,
    item("Remove from project", () => deleteAsset(assetId), { icon: "trash", danger: true }),
  ];
}
