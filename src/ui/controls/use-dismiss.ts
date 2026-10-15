import { useEffect, type RefObject } from "react";
import { POPOVER_ATTR } from "./Popover";

/**
 * Closes on a press outside every popover (except on `owner`, the trigger
 * that toggles it), on scroll-wheel outside, on resize and on window blur.
 */
export function useDismiss(
  onClose: () => void,
  active: boolean,
  owner?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return;
    const outside = (e: Event) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(`[${POPOVER_ATTR}]`)) return;
      if (owner?.current && target && owner.current.contains(target)) return;
      onClose();
    };
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("wheel", outside, { passive: true });
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("wheel", outside);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [active, onClose, owner]);
}
