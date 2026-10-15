import { createStore } from "zustand/vanilla";
import type { Id } from "../core/types";

export interface Filmstrip {
  /** Source seconds between consecutive frames. */
  interval: number;
  frames: ImageBitmap[];
}

/** Runtime-only facts about an imported file; never saved and never undone. */
export interface AssetRuntime {
  status: "loading" | "ready" | "missing" | "error";
  error?: string;
  poster?: ImageBitmap;
  filmstrip?: Filmstrip;
  /** Peak amplitude (0–1) per 1/PEAKS_PER_SECOND of source audio. */
  peaks?: Float32Array;
}

export const PEAKS_PER_SECOND = 100;

export interface MediaState {
  assets: Record<Id, AssetRuntime>;
  patch: (id: Id, patch: Partial<AssetRuntime>) => void;
  forget: (id: Id) => void;
}

export function createMediaStore() {
  return createStore<MediaState>()((set) => ({
    assets: {},
    patch: (id, patch) =>
      set((s) => ({
        assets: { ...s.assets, [id]: { status: "loading", ...s.assets[id], ...patch } },
      })),
    forget: (id) =>
      set((s) => {
        const { [id]: _gone, ...assets } = s.assets;
        return { assets };
      }),
  }));
}
