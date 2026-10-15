import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export type MenuEntry =
  | {
      kind: "item";
      label: string;
      run: () => void;
      shortcut?: string;
      disabled?: boolean;
      danger?: boolean;
      checked?: boolean;
    }
  | { kind: "separator" };

export interface OpenMenu {
  x: number;
  y: number;
  entries: MenuEntry[];
}

interface ContextMenuState {
  menu: OpenMenu | null;
  open: (menu: OpenMenu) => void;
  close: () => void;
}

export const contextMenuStore = createStore<ContextMenuState>()((set) => ({
  menu: null,
  open: (menu) => set({ menu }),
  close: () => set({ menu: null }),
}));

export const useContextMenu = () => useStore(contextMenuStore, (s) => s.menu);
