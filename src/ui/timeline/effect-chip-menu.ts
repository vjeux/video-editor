import type { MenuEntry } from "../../store/context-menu";

/** What a chip's menu can do to its effect; the caller binds video or audio commands. */
export interface ChipActions {
  toggle: (enabled: boolean) => void;
  move: (index: number) => void;
  remove: () => void;
}

/** Context menu for one effect chip on a clip. */
export function effectChipMenu(
  enabled: boolean,
  index: number,
  count: number,
  actions: ChipActions,
  locked: boolean,
): MenuEntry[] {
  return [
    {
      kind: "item",
      label: "Enabled",
      checked: enabled,
      disabled: locked,
      run: () => actions.toggle(!enabled),
    },
    { kind: "separator" },
    {
      kind: "item",
      label: "Move earlier",
      disabled: locked || index === 0,
      run: () => actions.move(index - 1),
    },
    {
      kind: "item",
      label: "Move later",
      disabled: locked || index === count - 1,
      run: () => actions.move(index + 1),
    },
    { kind: "separator" },
    {
      kind: "item",
      label: "Remove effect",
      icon: "trash",
      danger: true,
      disabled: locked,
      run: actions.remove,
    },
  ];
}
