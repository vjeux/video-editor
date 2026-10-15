import * as stylex from "@stylexjs/stylex";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { contextMenuStore, useContextMenu, type MenuEntry } from "../../store/context-menu";
import { colors, radii, shadows } from "../theme/tokens.stylex";
import { MenuItem } from "./MenuItem";
import { MenuSeparator } from "./MenuSeparator";

const EDGE = 8;

const appear = stylex.keyframes({
  from: { opacity: 0, transform: "scale(0.97) translateY(-2px)" },
});

const styles = stylex.create({
  menu: {
    position: "fixed",
    zIndex: 120,
    minWidth: 200,
    maxWidth: 280,
    padding: 4,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line2,
    backgroundColor: "rgba(28, 31, 38, 0.96)",
    backdropFilter: "blur(12px)",
    boxShadow: shadows.pop,
    outline: "none",
    transformOrigin: "top left",
    animationName: appear,
    animationDuration: "0.12s",
    animationTimingFunction: "ease-out",
  },
  at: (left: number, top: number) => ({ left, top }),
});

const close = () => contextMenuStore.getState().close();
const enabledIndexes = (entries: MenuEntry[]) =>
  entries.flatMap((e, i) => (e.kind === "item" && !e.disabled ? [i] : []));

/** The single right-click menu; its entries come from `app/menus.ts`. */
export function ContextMenu() {
  const menu = useContextMenu();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!menu || !el) return;
    const { width, height } = el.getBoundingClientRect();
    setPosition({
      left: Math.max(EDGE, Math.min(menu.x, window.innerWidth - width - EDGE)),
      top: Math.max(EDGE, Math.min(menu.y, window.innerHeight - height - EDGE)),
    });
    setActive(-1);
    el.focus();
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("wheel", close, { passive: true });
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("wheel", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [menu]);

  if (!menu) return null;
  const enabled = enabledIndexes(menu.entries);
  const run = (entry: MenuEntry) => {
    if (entry.kind !== "item" || entry.disabled) return;
    close();
    entry.run();
  };
  const step = (delta: number) => {
    if (enabled.length === 0) return;
    const at = enabled.indexOf(active);
    const next =
      at < 0
        ? delta > 0
          ? 0
          : enabled.length - 1
        : (at + delta + enabled.length) % enabled.length;
    setActive(enabled[next] ?? -1);
  };

  return (
    <div
      ref={ref}
      role="menu"
      tabIndex={-1}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        e.stopPropagation();
        const keys: Record<string, () => void> = {
          ArrowDown: () => step(1),
          ArrowUp: () => step(-1),
          Home: () => setActive(enabled[0] ?? -1),
          End: () => setActive(enabled.at(-1) ?? -1),
          Enter: () => menu.entries[active] && run(menu.entries[active]),
          Escape: close,
          Tab: close,
        };
        const handler = keys[e.key];
        if (!handler) return;
        e.preventDefault();
        handler();
      }}
      {...stylex.props(styles.menu, styles.at(position.left, position.top))}
    >
      {menu.entries.map((entry, i) =>
        entry.kind === "separator" ? (
          <MenuSeparator key={`sep-${i}`} />
        ) : (
          <MenuItem
            key={entry.label}
            item={entry}
            active={i === active}
            onHover={() => setActive(i)}
            onRun={() => run(entry)}
          />
        ),
      )}
    </div>
  );
}
