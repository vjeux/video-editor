import * as stylex from "@stylexjs/stylex";
import { setClipAnimation } from "../../app/effects";
import { openMenu } from "../../app/menus";
import { ANIMATION_PRESETS, ease } from "../../core/clip-animations";
import { timeToX } from "../../core/layout";
import type { Clip } from "../../core/types";
import { useGestureKey } from "../gesture";
import { animationMenu } from "./animation-menu";
import { capLabel } from "./cap-label";
import { animationDurationFromDrag } from "./fx-geometry";

const FIELD = { in: "animationIn", out: "animationOut" } as const;
const CURVE_SAMPLES = 16;
const TINT = "169, 157, 255";

const styles = stylex.create({
  band: {
    position: "absolute",
    top: 0,
    bottom: 0,
    // A solid stripe along the top marks the span even over busy filmstrips.
    boxShadow: `inset 0 3px 0 rgba(${TINT}, 0.95)`,
    zIndex: 1,
  },
  start: {
    left: 0,
    backgroundImage: `linear-gradient(90deg, rgba(${TINT}, 0.45), rgba(${TINT}, 0.14))`,
  },
  end: {
    right: 0,
    backgroundImage: `linear-gradient(270deg, rgba(${TINT}, 0.45), rgba(${TINT}, 0.14))`,
  },
  width: (width: number) => ({ width }),
  curve: { position: "absolute", inset: 0, pointerEvents: "none" },
  label: {
    position: "absolute",
    bottom: 3,
    display: "flex",
    alignItems: "center",
    gap: 3,
    height: 14,
    paddingInline: 5,
    borderRadius: 4,
    fontSize: 9.5,
    fontWeight: 650,
    whiteSpace: "nowrap",
    color: "#1c1440",
    backgroundColor: `rgba(${TINT}, 0.92)`,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.35)",
    pointerEvents: "none",
  },
  labelStart: (inset: number) => ({ left: 6 + inset }),
  labelEnd: (inset: number) => ({ right: 6 + inset }),
  edge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 9,
    cursor: "ew-resize",
    zIndex: 2,
    touchAction: "none",
    "::after": {
      content: '""',
      position: "absolute",
      top: 3,
      bottom: 3,
      left: 3,
      width: 2,
      borderRadius: 1,
      backgroundColor: `rgba(${TINT}, 0.95)`,
      boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.3)",
    },
  },
  edgeStart: { right: -4 },
  edgeEnd: { left: -4 },
});

/** The easing curve as an SVG path rising across the band (falling for exits). */
function curvePath(
  width: number,
  height: number,
  easing: Parameters<typeof ease>[0],
  exit: boolean,
) {
  const points = Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => {
    const p = i / CURVE_SAMPLES;
    const v = exit ? ease(easing, 1 - p) : ease(easing, p);
    return `${(p * width).toFixed(1)},${(height - 4 - v * (height - 8)).toFixed(1)}`;
  });
  return `M${points.join("L")}`;
}

/**
 * An enter or exit animation drawn over its span of the clip: tinted band,
 * the easing curve and the preset's name. Drag the inner edge to change its
 * length; right-click to swap the preset or remove it.
 */
export function AnimationCap({
  clip,
  which,
  pps,
  height,
  edgeInset,
  locked,
}: {
  clip: Clip;
  which: "in" | "out";
  pps: number;
  height: number;
  /** Pixels of this edge covered by a transition, kept clear of the label. */
  edgeInset: number;
  locked: boolean;
}) {
  const gesture = useGestureKey(`animation-${which}`);
  const animation = clip[FIELD[which]];
  if (!animation) return null;
  const width = Math.max(2, timeToX(Math.min(animation.duration, clip.duration), pps));
  const name = ANIMATION_PRESETS[animation.presetId]?.name ?? animation.presetId;
  const exit = which === "out";
  const label = capLabel(clip, which, pps);

  return (
    <div
      aria-label={`${exit ? "Out" : "In"} animation: ${name}`}
      data-tooltip={`${exit ? "Out" : "In"}: ${name} · ${animation.duration.toFixed(2)}s`}
      onContextMenu={(e) => {
        e.stopPropagation();
        openMenu(e, animationMenu(clip, which, locked));
      }}
      {...stylex.props(styles.band, exit ? styles.end : styles.start, styles.width(width))}
    >
      <svg width={width} height={height} aria-hidden {...stylex.props(styles.curve)}>
        <path
          d={curvePath(width, height, animation.easing, exit)}
          fill="none"
          stroke={`rgba(${TINT}, 0.9)`}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </svg>
      {label && (
        <span
          {...stylex.props(
            styles.label,
            exit ? styles.labelEnd(edgeInset) : styles.labelStart(edgeInset),
          )}
        >
          {label.text}
        </span>
      )}
      {!locked && (
        <span
          aria-hidden
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            const target = e.currentTarget;
            target.setPointerCapture(e.pointerId);
            const startX = e.clientX;
            const move = (ev: PointerEvent) =>
              setClipAnimation(
                clip.id,
                which,
                {
                  ...animation,
                  duration: animationDurationFromDrag(
                    animation.duration,
                    which,
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
          }}
          {...stylex.props(styles.edge, exit ? styles.edgeEnd : styles.edgeStart)}
        />
      )}
    </div>
  );
}
