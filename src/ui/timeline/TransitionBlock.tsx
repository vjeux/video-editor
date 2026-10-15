import * as stylex from "@stylexjs/stylex";
import { updateTransition } from "../../app/effects";
import { openMenu } from "../../app/menus";
import type { Id, Project, TransitionInstance } from "../../core/types";
import { useEditor } from "../../store";
import { useGestureKey } from "../gesture";
import { colors } from "../theme/tokens.stylex";
import { transitionDurationFromDrag } from "./fx-geometry";
import { transitionMenu } from "./transition-menu";

/** Narrow windows still get a clickable target. */
const MIN_WIDTH = 16;
const LABEL_MIN_WIDTH = 74;
const SECONDS_MIN_WIDTH = 34;
const ICON_MIN_WIDTH = 26;

const styles = stylex.create({
  block: {
    position: "absolute",
    top: 4,
    bottom: 4,
    zIndex: 5,
    display: "grid",
    placeItems: "center",
    borderRadius: 5,
    overflow: "visible",
    cursor: "pointer",
    color: "#fff",
    backgroundColor: { default: "rgba(16, 12, 34, 0.55)", ":hover": "rgba(26, 20, 56, 0.7)" },
    backdropFilter: "blur(2px) saturate(1.2)",
    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.4), 0 2px 8px rgba(0, 0, 0, 0.45)",
    touchAction: "none",
    outline: "none",
  },
  at: (left: number, width: number) => ({ left, width }),
  focused: {
    boxShadow: `inset 0 0 0 2px ${colors.accent2}, 0 0 0 1px rgba(0, 0, 0, 0.5), 0 2px 10px rgba(124, 108, 255, 0.45)`,
  },
  cross: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  },
  label: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    paddingInline: 6,
    paddingBlock: 2,
    borderRadius: 4,
    backgroundColor: "rgba(16, 12, 34, 0.8)",
    fontSize: 9.5,
    fontWeight: 650,
    lineHeight: 1.1,
    whiteSpace: "nowrap",
    maxWidth: "calc(100% - 12px)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    pointerEvents: "none",
  },
  seconds: { fontSize: 8.5, fontWeight: 500, opacity: 0.7 },
  edge: {
    position: "absolute",
    top: -1,
    bottom: -1,
    width: 7,
    cursor: "ew-resize",
    zIndex: 1,
    borderRadius: 3,
    backgroundColor: { default: "transparent", ":hover": "rgba(169, 157, 255, 0.85)" },
  },
  edgeStart: { left: -3 },
  edgeEnd: { right: -3 },
});

/**
 * A transition drawn over its whole window across the cut: the two shots
 * crossing, its name and length. Click to select (Delete removes it), drag
 * either edge to resize it about the cut, right-click to change or remove.
 */
export function TransitionBlock({
  project,
  clipId,
  transition,
  name,
  left,
  width,
  pps,
  locked,
}: {
  project: Project;
  /** The clip the transition leads into. */
  clipId: Id;
  transition: TransitionInstance;
  name: string;
  left: number;
  width: number;
  pps: number;
  locked: boolean;
}) {
  const focused = useEditor((s) => s.focusedTransition === clipId);
  const focusTransition = useEditor((s) => s.focusTransition);
  const gesture = useGestureKey("transition");
  const shown = Math.max(MIN_WIDTH, width);
  const seconds = `${transition.duration.toFixed(1)}s`;

  const resize = (edge: "start" | "end") => (e: React.PointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    focusTransition(clipId);
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const move = (ev: PointerEvent) =>
      updateTransition(
        clipId,
        {
          duration: transitionDurationFromDrag(
            transition.duration,
            edge,
            (ev.clientX - startX) / pps,
          ),
        },
        gesture.key,
      );
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
      gesture.renew();
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label={`Transition: ${name}, ${seconds}`}
      aria-pressed={focused}
      data-tooltip={shown < LABEL_MIN_WIDTH ? `${name} · ${seconds}` : undefined}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        focusTransition(clipId);
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        focusTransition(clipId);
        openMenu(e, transitionMenu(project, clipId, transition, locked));
      }}
      {...stylex.props(
        styles.block,
        styles.at(left - (shown - width) / 2, shown),
        focused && styles.focused,
      )}
    >
      {shown >= ICON_MIN_WIDTH && (
        <svg
          aria-hidden
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
          {...stylex.props(styles.cross)}
        >
          <path
            d="M0 0L100 100M0 100L100 0"
            stroke="rgba(255, 255, 255, 0.28)"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      {shown >= SECONDS_MIN_WIDTH && (
        <span {...stylex.props(styles.label)}>
          {shown >= LABEL_MIN_WIDTH && name}
          <span {...stylex.props(styles.seconds)}>{seconds}</span>
        </span>
      )}
      {!locked &&
        (["start", "end"] as const).map((edge) => (
          <span
            key={edge}
            aria-hidden
            onPointerDown={resize(edge)}
            {...stylex.props(styles.edge, edge === "start" ? styles.edgeStart : styles.edgeEnd)}
          />
        ))}
    </div>
  );
}
