import * as stylex from "@stylexjs/stylex";
import { openMenu } from "../../app/menus";
import type { Id, TransitionInstance } from "../../core/types";
import { useEditor } from "../../store";
import { colors, radii } from "../theme/tokens.stylex";
import { transitionMenu } from "./transition-menu";

/** Narrow windows still get a clickable target. */
const MIN_WIDTH = 16;

const styles = stylex.create({
  badge: {
    position: "absolute",
    top: "50%",
    height: 16,
    transform: "translateY(-50%)",
    zIndex: 5,
    padding: 0,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.35)",
    borderRadius: radii.pill,
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    cursor: "pointer",
    color: colors.text,
    backgroundColor: { default: "rgba(22, 24, 29, 0.78)", ":hover": "rgba(35, 39, 49, 0.92)" },
    backgroundImage: "linear-gradient(90deg, rgba(124, 108, 255, 0.35), rgba(255, 108, 181, 0.35))",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.45)",
    touchAction: "none",
  },
  at: (left: number, width: number) => ({ left, width }),
  selected: {
    borderColor: "#fff",
    boxShadow: `inset 0 0 0 2px ${colors.accent}, 0 1px 4px rgba(0, 0, 0, 0.45)`,
  },
  icon: { flexShrink: 0, pointerEvents: "none" },
});

/** Pill spanning a transition's window over its cut; selects it, right-click for options. */
export function TransitionBadge({
  clipId,
  transition,
  name,
  left,
  width,
  locked,
}: {
  /** The clip the transition leads into. */
  clipId: Id;
  transition: TransitionInstance;
  name: string;
  left: number;
  width: number;
  locked: boolean;
}) {
  const focused = useEditor((s) => s.focusedTransition === clipId);
  const focusTransition = useEditor((s) => s.focusTransition);
  const shown = Math.max(MIN_WIDTH, width);
  const label = `Transition: ${name}`;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={focused}
      {...stylex.props(
        styles.badge,
        styles.at(left - (shown - width) / 2, shown),
        focused && styles.selected,
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        focusTransition(clipId);
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        focusTransition(clipId);
        openMenu(e, transitionMenu(clipId, transition, locked));
      }}
    >
      <svg width={12} height={10} viewBox="0 0 12 10" aria-hidden {...stylex.props(styles.icon)}>
        <path d="M1 1l10 8V1L1 9z" fill="currentColor" fillOpacity={0.85} />
      </svg>
    </button>
  );
}
