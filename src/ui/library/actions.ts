import {
  addAdjustmentLayer,
  applyEffect,
  applyTransition,
  applyTransitionToAllCuts,
  deleteCustomEffect,
  exportEffects,
  setClipAnimation,
} from "../../app/effects";
import { previousAdjacent } from "../../core/effects";
import type { EffectDefinition, EffectKind, Id } from "../../core/types";
import { editorStore } from "../../store";
import type { MenuEntry } from "../../store/context-menu";
import { noticeStore } from "../../store/notices";
import { studioStore } from "../../store/studio";

const SEPARATOR: MenuEntry = { kind: "separator" };
const item = (
  label: string,
  run: () => void,
  extra: Partial<Extract<MenuEntry, { kind: "item" }>> = {},
): MenuEntry => ({ kind: "item", label, run, ...extra });

const info = (message: string) => noticeStore.getState().push("info", message);

/** The selected clip when it is the only one and starts on a cut. */
function selectedCut(): Id | null {
  const { project, selection } = editorStore.getState();
  const clip = selection.length === 1 ? project.clips[selection[0] ?? ""] : undefined;
  return clip && previousAdjacent(project, clip) ? clip.id : null;
}

function applyTransitionToSelection(effectId: string) {
  const clipId = selectedCut();
  if (!clipId) {
    info("Select the clip after a cut, or drag the transition onto a cut");
    return;
  }
  applyTransition(clipId, effectId);
}

const studioEntries = (def: EffectDefinition, custom: boolean): MenuEntry[] => [
  item("Duplicate & edit in Studio", () =>
    studioStore.getState().open({ mode: "duplicate", effectId: def.id }),
  ),
  ...(custom
    ? [
        item("Edit in Studio", () =>
          studioStore.getState().open({ mode: "edit", effectId: def.id }),
        ),
        item("Export…", () => exportEffects([def.id], def.name)),
        SEPARATOR,
        item("Delete", () => deleteCustomEffect(def.id), { danger: true }),
      ]
    : []),
];

interface KindActions {
  /** Double-click on a tile. */
  apply: (effectId: string) => void;
  menu: (def: EffectDefinition, custom: boolean) => MenuEntry[];
  hint: string;
}

/** What a library tile does, by definition kind. */
export const KIND_ACTIONS: Record<EffectKind, KindActions> = {
  effect: {
    apply: (effectId) => applyEffect(effectId),
    menu: (def, custom) => [
      item("Apply to selection", () => applyEffect(def.id)),
      item("Add as adjustment layer", () => addAdjustmentLayer(def.id)),
      SEPARATOR,
      ...studioEntries(def, custom),
    ],
    hint: "Double-click to apply to the selection, or drag onto a clip",
  },
  transition: {
    apply: applyTransitionToSelection,
    menu: (def, custom) => [
      item("Apply to selected cut", () => applyTransitionToSelection(def.id), {
        disabled: !selectedCut(),
      }),
      item("Apply to all cuts", () => applyTransitionToAllCuts(def.id)),
      SEPARATOR,
      ...studioEntries(def, custom),
    ],
    hint: "Drag onto a cut, or double-click to apply to the selected clip's cut",
  },
};

let batch = 0;

/** Sets an enter or exit animation on every selected clip, as one undo step. */
export function animateSelection(presetId: string, which: "in" | "out") {
  const { selection } = editorStore.getState();
  if (selection.length === 0) {
    info("Select a clip first");
    return;
  }
  const coalesce = `library-animation-${++batch}`;
  for (const clipId of selection) {
    setClipAnimation(clipId, which, { presetId, duration: 0.6, easing: "easeOut" }, coalesce);
  }
}

export const animationMenu = (presetId: string): MenuEntry[] => [
  item("Set as In", () => animateSelection(presetId, "in")),
  item("Set as Out", () => animateSelection(presetId, "out")),
];
