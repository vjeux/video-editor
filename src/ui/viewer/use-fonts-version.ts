import { useSyncExternalStore } from "react";

let version = 0;
const listeners = new Set<() => void>();
document.fonts.addEventListener("loadingdone", () => {
  version++;
  for (const listener of listeners) listener();
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Increments whenever web fonts finish loading, so text measurements can be redone. */
export const useFontsVersion = () => useSyncExternalStore(subscribe, () => version);
