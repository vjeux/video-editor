import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

interface SessionState {
  saving: boolean;
  savedAt: number | null;
}

export const sessionStore = createStore<SessionState>()(() => ({ saving: false, savedAt: null }));
export const useSession = <T>(selector: (s: SessionState) => T): T =>
  useStore(sessionStore, selector);
