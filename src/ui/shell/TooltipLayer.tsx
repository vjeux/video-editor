import * as stylex from "@stylexjs/stylex";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Kbd } from "../controls/Kbd";
import { placePopover } from "../controls/placement";
import { colors, motion, shadows } from "../theme/tokens.stylex";

/** Rest time before the first tooltip shows… */
const DELAY_MS = 450;
/** …and how long after one hides that the next shows instantly. */
const WARM_MS = 500;
const GAP = 6;

const appear = stylex.keyframes({ from: { opacity: 0, transform: "translateY(-2px)" } });

const styles = stylex.create({
  tip: {
    position: "fixed",
    zIndex: 130,
    display: "flex",
    alignItems: "center",
    gap: 6,
    maxWidth: 280,
    paddingBlock: 4,
    paddingInlineStart: 8,
    paddingInlineEnd: 6,
    borderRadius: 6,
    backgroundColor: "#2a2e3a",
    boxShadow: shadows.popover,
    color: colors.text,
    fontSize: 11.5,
    fontWeight: 500,
    whiteSpace: "nowrap",
    pointerEvents: "none",
    animationName: appear,
    animationDuration: motion.fast,
    animationTimingFunction: motion.ease,
  },
  noKeys: { paddingInlineEnd: 8 },
  at: (left: number, top: number) => ({ left, top }),
  measuring: { visibility: "hidden" },
});

interface Tip {
  text: string;
  keys: string | null;
  rect: DOMRect;
}

/** "Undo (⌘Z)" → the label and its shortcut, drawn as key caps. */
function parse(label: string): { text: string; keys: string | null } {
  const match = /^(.*?)\s*\(([^)]+)\)$/.exec(label);
  return match?.[1] && match[2] ? { text: match[1], keys: match[2] } : { text: label, keys: null };
}

const tipTarget = (node: EventTarget | null) =>
  node instanceof Element ? node.closest<HTMLElement>("[data-tooltip]") : null;

/**
 * One tooltip for the whole app, shown for any element with `data-tooltip`
 * after a short rest (instantly while another was just visible), and for
 * keyboard focus. Any press, scroll or key hides it.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer = 0;
    let warmUntil = 0;
    let current: HTMLElement | null = null;
    const show = (el: HTMLElement) => {
      const label = el.dataset.tooltip;
      if (!label) return;
      setPosition(null);
      setTip({ ...parse(label), rect: el.getBoundingClientRect() });
    };
    const hide = () => {
      clearTimeout(timer);
      if (current) warmUntil = performance.now() + WARM_MS;
      current = null;
      setTip(null);
    };
    const over = (e: PointerEvent) => {
      const el = tipTarget(e.target);
      if (el === current) return;
      hide();
      if (!el || e.pointerType === "touch") return;
      current = el;
      if (performance.now() < warmUntil) show(el);
      else timer = window.setTimeout(() => show(el), DELAY_MS);
    };
    const focus = (e: FocusEvent) => {
      const el = tipTarget(e.target);
      if (el?.matches(":focus-visible")) {
        hide();
        current = el;
        show(el);
      }
    };
    const options = { capture: true, passive: true };
    window.addEventListener("pointerover", over, options);
    window.addEventListener("pointerdown", hide, options);
    window.addEventListener("wheel", hide, options);
    window.addEventListener("keydown", hide, options);
    window.addEventListener("focusin", focus, options);
    window.addEventListener("focusout", hide, options);
    window.addEventListener("blur", hide);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerover", over, options);
      window.removeEventListener("pointerdown", hide, options);
      window.removeEventListener("wheel", hide, options);
      window.removeEventListener("keydown", hide, options);
      window.removeEventListener("focusin", focus, options);
      window.removeEventListener("focusout", hide, options);
      window.removeEventListener("blur", hide);
    };
  }, []);

  // Centre under the target, flipping above it near the bottom edge.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!tip || !el) return;
    const { width, height } = el.getBoundingClientRect();
    const { rect } = tip;
    const anchor = {
      x: rect.x + rect.width / 2 - width / 2,
      y: rect.y,
      width,
      height: rect.height,
    };
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    setPosition(placePopover(anchor, { width, height }, viewport, "below", GAP));
  }, [tip]);

  if (!tip) return null;
  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      {...stylex.props(
        styles.tip,
        !tip.keys && styles.noKeys,
        styles.at(position?.left ?? 0, position?.top ?? 0),
        !position && styles.measuring,
      )}
    >
      {tip.text}
      {tip.keys && <Kbd>{tip.keys}</Kbd>}
    </div>,
    document.body,
  );
}
