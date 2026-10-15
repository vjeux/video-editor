import { applyTransition, clearTransition } from "../../app/effects";
import type { Id, TransitionInstance } from "../../core/types";
import type { MenuEntry } from "../../store/context-menu";

const DURATION_PRESETS = [0.5, 1, 2] as const;
const EPSILON = 1e-6;

/** Context menu for the transition into `clipId`. */
export function transitionMenu(
  clipId: Id,
  transition: TransitionInstance,
  locked: boolean,
): MenuEntry[] {
  return [
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
      run: () => clearTransition(clipId),
      shortcut: "⌫",
      danger: true,
      disabled: locked,
    },
  ];
}
