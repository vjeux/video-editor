import * as stylex from "@stylexjs/stylex";
import { openMenu } from "../../app/menus";
import { ANIMATION_PRESETS } from "../../core/clip-animations";
import type { Clip } from "../../core/types";
import { animationMenu } from "./animation-menu";

const styles = stylex.create({
  badge: {
    position: "absolute",
    top: 3,
    right: 8,
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: 3,
    height: 14,
    paddingInline: 5,
    borderRadius: 4,
    fontSize: 9.5,
    fontWeight: 650,
    whiteSpace: "nowrap",
    color: "#ffd9ec",
    backgroundColor: "rgba(40, 10, 30, 0.7)",
    boxShadow: "inset 0 0 0 1px rgba(255, 108, 181, 0.55)",
    cursor: "context-menu",
  },
});

/** The clip's loop animation as a badge; right-click to change or remove it. */
export function LoopBadge({ clip, locked }: { clip: Clip; locked: boolean }) {
  const loop = clip.animationLoop;
  if (!loop) return null;
  const name = ANIMATION_PRESETS[loop.presetId]?.name ?? loop.presetId;
  return (
    <span
      aria-label={`Loop animation: ${name}`}
      data-tooltip={`Loop: ${name} every ${loop.duration}s`}
      onContextMenu={(e) => {
        e.stopPropagation();
        openMenu(e, animationMenu(clip, "loop", locked));
      }}
      {...stylex.props(styles.badge)}
    >
      <svg width={12} height={8} viewBox="0 0 12 8" aria-hidden>
        <path
          d="M0.5 4C2 0.5 4 0.5 6 4S10 7.5 11.5 4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
      {name}
    </span>
  );
}
