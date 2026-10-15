import { useSyncExternalStore } from "react";

/** Single column with slide-over panels below this width. */
export const COMPACT_QUERY = "(max-width: 999px)";

/** Phone-sized: icon-only and compact controls. */
export const PHONE_QUERY = "(max-width: 599px)";

/** Re-renders when a media query starts or stops matching. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
