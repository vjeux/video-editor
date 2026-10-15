import { setClipAnimation } from "../../app/effects";
import type { Clip, ClipAnimation } from "../../core/types";
import type { MenuEntry } from "../../store/context-menu";
import { ANIMATION_GROUPS } from "../inspector/options";

type Which = "in" | "out" | "loop";

const FIELD = { in: "animationIn", out: "animationOut", loop: "animationLoop" } as const;
const LENGTHS: Record<Which, readonly number[]> = {
  in: [0.3, 0.5, 1],
  out: [0.3, 0.5, 1],
  loop: [0.5, 1, 2],
};
const EPSILON = 1e-6;

/** Context menu for one of a clip's animations: swap the preset, pick a length, remove. */
export function animationMenu(clip: Clip, which: Which, locked: boolean): MenuEntry[] {
  const animation = clip[FIELD[which]];
  if (!animation) return [];
  const set = (next: ClipAnimation | null) => setClipAnimation(clip.id, which, next);
  const presets = ANIMATION_GROUPS[which].flatMap((group, i): MenuEntry[] => [
    ...(i > 0 ? [{ kind: "separator" } as const] : []),
    ...group.presets.map((p): MenuEntry => ({
      kind: "item",
      label: p.name,
      checked: p.id === animation.presetId,
      disabled: locked,
      run: () => set({ ...animation, presetId: p.id }),
    })),
  ]);
  return [
    { kind: "submenu", label: "Change", icon: "reset", entries: presets, disabled: locked },
    { kind: "separator" },
    ...LENGTHS[which].map((seconds): MenuEntry => ({
      kind: "item",
      label: `${which === "loop" ? "Period" : "Duration"} ${seconds}s`,
      checked: Math.abs(animation.duration - seconds) < EPSILON,
      disabled: locked,
      run: () => set({ ...animation, duration: seconds }),
    })),
    { kind: "separator" },
    {
      kind: "item",
      label: "Remove animation",
      icon: "trash",
      danger: true,
      disabled: locked,
      run: () => set(null),
    },
  ];
}
