import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { Id } from "../core/types";

/** Which clip the auto-captions dialog is generating captions for. */
interface CaptionsState {
  clipId: Id | null;
  open: (clipId: Id) => void;
  close: () => void;
}

export const captionsStore = createStore<CaptionsState>()((set) => ({
  clipId: null,
  open: (clipId) => set({ clipId }),
  close: () => set({ clipId: null }),
}));

export const useCaptions = <T>(selector: (s: CaptionsState) => T): T =>
  useStore(captionsStore, selector);
