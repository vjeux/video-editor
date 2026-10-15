import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

interface SessionState {
  fileTask: "saving" | "opening" | null;
  saving: boolean;
  savedAt: number | null;
}

export const sessionStore = createStore<SessionState>()(() => ({
  saving: false,
  savedAt: null,
  fileTask: null,
}));
export const useSession = <T>(selector: (s: SessionState) => T): T =>
  useStore(sessionStore, selector);
