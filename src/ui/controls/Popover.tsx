import * as stylex from "@stylexjs/stylex";
import {
  useLayoutEffect,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { colors, motion, shadows } from "../theme/tokens.stylex";
import { placePopover, type Rect } from "./placement";

const appear = stylex.keyframes({
  from: { opacity: 0, transform: "scale(0.96) translateY(-3px)" },
});

const styles = stylex.create({
  panel: {
    position: "fixed",
    zIndex: 120,
    maxHeight: "calc(100vh - 16px)",
    overflowY: "auto",
    overscrollBehavior: "contain",
    padding: 4,
    borderRadius: 10,
    backgroundColor: colors.popover,
    backdropFilter: "blur(16px) saturate(1.4)",
    boxShadow: shadows.popover,
    outline: "none",
    transformOrigin: "top left",
    animationName: appear,
    animationDuration: motion.fast,
    animationTimingFunction: motion.ease,
  },
  at: (left: number, top: number, minWidth: number) => ({ left, top, minWidth }),
  /** Laid out but not shown until measured, so it never flashes at the origin. */
  measuring: { opacity: 0 },
});

/** Marks every popover so a press inside a nested one is not "outside" its parent. */
export const POPOVER_ATTR = "data-popover";

/**
 * A floating panel placed against `anchor` (an element's rect, or a bare
 * point for context menus), flipped and clamped to stay on screen and
 * portalled out of any clipping ancestor. Focuses itself when shown.
 * Callers keep `anchor` in state: a new object re-places the panel.
 */
export function Popover({
  anchor,
  side = "below",
  gap,
  role,
  label,
  minWidth = 0,
  onKeyDown,
  ref,
  children,
}: {
  anchor: Rect;
  side?: "below" | "right";
  gap?: number;
  role: "menu" | "listbox" | "dialog";
  label?: string;
  minWidth?: number;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  ref: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    setPosition(placePopover(anchor, { width, height }, viewport, side, gap));
    el.focus({ preventScroll: true });
  }, [anchor, side, gap, ref]);

  return createPortal(
    <div
      ref={ref}
      role={role}
      aria-label={label}
      tabIndex={-1}
      {...{ [POPOVER_ATTR]: "" }}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      {...stylex.props(
        styles.panel,
        styles.at(position?.left ?? anchor.x, position?.top ?? anchor.y, minWidth),
        !position && styles.measuring,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}
