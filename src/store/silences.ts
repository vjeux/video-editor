import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { SilenceOptions, Span } from "../core/silences";
import type { Id } from "../core/types";

/** Silences found in a clip, shown on the timeline until removed or dismissed. */
export interface SilencePreview {
  clipId: Id;
  options: SilenceOptions;
  spans: Span[];
}

interface SilenceState {
  preview: SilencePreview | null;
  show: (preview: SilencePreview) => void;
  clear: () => void;
}

export const silenceStore = createStore<SilenceState>()((set) => ({
  preview: null,
  show: (preview) => set({ preview }),
  clear: () => set({ preview: null }),
}));

export const useSilences = <T>(selector: (s: SilenceState) => T): T =>
  useStore(silenceStore, selector);
