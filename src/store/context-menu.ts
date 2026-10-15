import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/** `icon` names an icon the UI knows; an unknown name throws when the menu renders. */
export type MenuEntry =
  | {
      kind: "item";
      label: string;
      run: () => void;
      icon?: string;
      shortcut?: string;
      disabled?: boolean;
      danger?: boolean;
      checked?: boolean;
    }
  | { kind: "submenu"; label: string; icon?: string; entries: MenuEntry[]; disabled?: boolean }
  | { kind: "separator" };

export interface OpenMenu {
  x: number;
  y: number;
  entries: MenuEntry[];
}

/** Each opening gets its own id, so reopening on the same spot starts fresh. */
type ShownMenu = OpenMenu & { id: number };

interface ContextMenuState {
  menu: ShownMenu | null;
  open: (menu: OpenMenu) => void;
  close: () => void;
}

let opened = 0;

export const contextMenuStore = createStore<ContextMenuState>()((set) => ({
  menu: null,
  open: (menu) => set({ menu: { ...menu, id: ++opened } }),
  close: () => set({ menu: null }),
}));

export const useContextMenu = () => useStore(contextMenuStore, (s) => s.menu);
