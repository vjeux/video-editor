import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { MenuEntry } from "../../store/context-menu";
import type { Rect } from "../controls/placement";
import { Popover } from "../controls/Popover";
import { stepEnabled } from "../controls/roving";
import { MenuItem } from "./MenuItem";
import { MenuSeparator } from "./MenuSeparator";

/** How long the pointer rests on a row before its submenu opens or another closes. */
const HOVER_INTENT_MS = 140;
/** Panel padding plus border, so a submenu's first row lines up with its parent row. */
const PANEL_INSET = 4;

const styles = stylex.create({
  panel: { minWidth: 212, maxWidth: 300 },
});

type Open = { index: number; anchor: Rect } | null;

/**
 * One level of a context menu. Submenus open on hover (after a short
 * intent delay), ArrowRight or Enter, and close with ArrowLeft or Escape.
 */
export function MenuPanel({
  entries,
  anchor,
  side,
  onClose,
  onBack,
}: {
  entries: MenuEntry[];
  anchor: Rect;
  side: "below" | "right";
  /** Closes the whole menu. */
  onClose: () => void;
  /** Closes just this submenu, returning focus to its parent. */
  onBack?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);
  /** The row the pointer rests on; keyboard moves leave it alone. */
  const [hovered, setHovered] = useState(-1);
  const [sub, setSub] = useState<Open>(null);
  const enabled = entries.map((e) => e.kind !== "separator" && !e.disabled);

  const openSub = (index: number) => {
    const row = ref.current?.querySelector(`[data-index="${index}"]`)?.getBoundingClientRect();
    if (!row || entries[index]?.kind !== "submenu") return;
    setSub({
      index,
      anchor: { x: row.x, y: row.y - PANEL_INSET, width: row.width, height: row.height },
    });
  };
  const closeSub = () => {
    setSub(null);
    ref.current?.focus({ preventScroll: true });
  };

  // Hover intent: follow the pointer's resting row, not every row it crosses.
  useEffect(() => {
    if (hovered < 0 || sub?.index === hovered) return;
    const timer = setTimeout(() => {
      if (entries[hovered]?.kind === "submenu") openSub(hovered);
      else if (sub) closeSub();
    }, HOVER_INTENT_MS);
    return () => clearTimeout(timer);
  });

  const pick = (index: number) => {
    const entry = entries[index];
    if (!entry || entry.kind === "separator" || entry.disabled) return;
    if (entry.kind === "submenu") return openSub(index);
    onClose();
    entry.run();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const keys: Record<string, () => void> = {
      ArrowDown: () => setActive(stepEnabled(enabled, active, 1)),
      ArrowUp: () => setActive(stepEnabled(enabled, active, -1)),
      Home: () => setActive(stepEnabled(enabled, -1, 1)),
      End: () => setActive(stepEnabled(enabled, -1, -1)),
      ArrowRight: () => openSub(active),
      ArrowLeft: () => onBack?.(),
      Enter: () => pick(active),
      " ": () => pick(active),
      Escape: () => (onBack ?? onClose)(),
      Tab: onClose,
    };
    const handler = keys[e.key];
    if (!handler) return;
    e.preventDefault();
    handler();
  };

  const open = sub ? entries[sub.index] : undefined;
  return (
    <>
      <Popover
        ref={ref}
        anchor={anchor}
        side={side}
        gap={side === "right" ? 2 : 0}
        role="menu"
        onKeyDown={onKeyDown}
      >
        <div {...stylex.props(styles.panel)}>
          {entries.map((entry, i) =>
            entry.kind === "separator" ? (
              <MenuSeparator key={`separator-${i}`} />
            ) : (
              <MenuItem
                key={entry.label}
                entry={entry}
                index={i}
                active={i === active || i === sub?.index}
                onHover={() => {
                  setActive(i);
                  setHovered(i);
                }}
                onPick={() => pick(i)}
              />
            ),
          )}
        </div>
      </Popover>
      {sub && open?.kind === "submenu" && (
        <MenuPanel
          entries={open.entries}
          anchor={sub.anchor}
          side="right"
          onClose={onClose}
          onBack={closeSub}
        />
      )}
    </>
  );
}
