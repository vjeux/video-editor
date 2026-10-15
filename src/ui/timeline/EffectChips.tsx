import * as stylex from "@stylexjs/stylex";
import { openMenu } from "../../app/menus";
import type { MenuEntry } from "../../store/context-menu";
import { fonts, motion } from "../theme/tokens.stylex";
import { fitChips } from "./fx-geometry";

export interface ChipItem {
  id: string;
  name: string;
  enabled: boolean;
}

const styles = stylex.create({
  strip: {
    position: "absolute",
    right: 6,
    bottom: 3,
    display: "flex",
    gap: 4,
    zIndex: 2,
    pointerEvents: "none",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    height: 14,
    paddingBlock: 0,
    paddingInline: 5,
    borderWidth: 0,
    borderRadius: 4,
    fontFamily: fonts.sans,
    fontSize: 9.5,
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: "nowrap",
    color: "#f2efff",
    backgroundColor: { default: "rgba(18, 14, 38, 0.72)", ":hover": "rgba(36, 30, 70, 0.9)" },
    boxShadow: "inset 0 0 0 1px rgba(169, 157, 255, 0.35)",
    backdropFilter: "blur(4px)",
    cursor: "pointer",
    pointerEvents: "auto",
    transitionProperty: "background-color, opacity",
    transitionDuration: motion.fast,
  },
  off: { opacity: 0.55, textDecoration: "line-through" },
  dot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
    backgroundColor: "#a99dff",
    boxShadow: "0 0 4px #a99dff",
  },
  dotOff: { backgroundColor: "transparent", boxShadow: "inset 0 0 0 1px #a99dff" },
  more: { fontFamily: fonts.mono, color: "#cfc8ff" },
  inset: (left: number) => ({ left }),
});

/**
 * The clip's effect stack as chips along its bottom edge: click to bypass
 * (quick before/after), right-click for its menu. Chips that do not fit
 * collapse into a "+N" counter that selects the clip.
 */
export function EffectChips({
  items,
  width,
  inset,
  onToggle,
  menuFor,
  onMore,
}: {
  items: readonly ChipItem[];
  /** Pixels available along the clip, starting `inset` pixels in. */
  width: number;
  inset: number;
  onToggle: (id: string, enabled: boolean) => void;
  menuFor: (id: string, index: number) => MenuEntry[];
  onMore: () => void;
}) {
  const { shown, hidden } = fitChips(
    items.map((i) => i.name),
    width,
  );
  if (shown + hidden === 0) return null;
  const rest = items.slice(shown);
  return (
    <div {...stylex.props(styles.strip, styles.inset(inset))}>
      {items.slice(0, shown).map((item, index) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={item.enabled}
          aria-label={`${item.name} effect`}
          data-tooltip={`${item.name} — click to ${item.enabled ? "bypass" : "enable"}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onToggle(item.id, !item.enabled)}
          onContextMenu={(e) => {
            e.stopPropagation();
            openMenu(e, menuFor(item.id, index));
          }}
          {...stylex.props(styles.chip, !item.enabled && styles.off)}
        >
          <span {...stylex.props(styles.dot, !item.enabled && styles.dotOff)} />
          {item.name}
        </button>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          aria-label={`${hidden} more effects`}
          data-tooltip={rest.map((i) => i.name).join(", ")}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onMore}
          {...stylex.props(styles.chip, styles.more)}
        >
          +{hidden}
        </button>
      )}
    </div>
  );
}
