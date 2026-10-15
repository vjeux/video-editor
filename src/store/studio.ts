import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { EffectKind } from "../core/types";

/** What the Effect Studio is editing: an existing effect (to edit or duplicate) or a blank one. */
export type StudioTarget =
  | { mode: "edit"; effectId: string }
  | { mode: "duplicate"; effectId: string }
  | { mode: "new"; kind: EffectKind };

interface StudioState {
  target: StudioTarget | null;
  open: (target: StudioTarget) => void;
  close: () => void;
}

export const studioStore = createStore<StudioState>()((set) => ({
  target: null,
  open: (target) => set({ target }),
  close: () => set({ target: null }),
}));

export const useStudio = <T>(selector: (s: StudioState) => T): T => useStore(studioStore, selector);
