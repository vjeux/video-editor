import { applyTransition, clearTransition } from "../../app/effects";
import type { Id, Project, TransitionInstance } from "../../core/types";
import { allEffects } from "../../effects/resolve";
import type { MenuEntry } from "../../store/context-menu";
import { groupByCategory } from "../inspector/effect-stack";

const DURATION_PRESETS = [0.5, 1, 2] as const;
const EPSILON = 1e-6;

/** Every transition, grouped by category, to swap the current one for. */
const changeEntries = (
  project: Project,
  clipId: Id,
  transition: TransitionInstance,
  locked: boolean,
): MenuEntry[] =>
  groupByCategory(allEffects(project), "transition", "").flatMap((category, i): MenuEntry[] => [
    ...(i > 0 ? [{ kind: "separator" } as const] : []),
    ...category.effects.map((def): MenuEntry => ({
      kind: "item",
      label: def.name,
      checked: def.id === transition.effectId,
      disabled: locked,
      run: () => applyTransition(clipId, def.id, transition.duration),
    })),
  ]);

/** Context menu for the transition into `clipId`. */
export function transitionMenu(
  project: Project,
  clipId: Id,
  transition: TransitionInstance,
  locked: boolean,
): MenuEntry[] {
  return [
    {
      kind: "submenu",
      label: "Change",
      icon: "transition",
      entries: changeEntries(project, clipId, transition, locked),
      disabled: locked,
    },
    { kind: "separator" },
    ...DURATION_PRESETS.map((seconds): MenuEntry => ({
      kind: "item",
      label: `Duration ${seconds}s`,
      run: () => applyTransition(clipId, transition.effectId, seconds),
      checked: Math.abs(transition.duration - seconds) < EPSILON,
      disabled: locked,
    })),
    { kind: "separator" },
    {
      kind: "item",
      label: "Remove transition",
      icon: "trash",
      run: () => clearTransition(clipId),
      shortcut: "⌫",
      danger: true,
      disabled: locked,
    },
  ];
}
