import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { openMenu } from "../../app/menus";
import type { AnimationPreset } from "../../core/clip-animations";
import { BUILTIN_EFFECTS } from "../../effects/library";
import { colors, radii } from "../theme/tokens.stylex";
import { animateSelection, animationMenu } from "./actions";
import { initialOf } from "./catalog";
import { EffectThumb } from "./EffectThumb";
import { MotionPreview } from "./MotionPreview";

const styles = stylex.create({
  tile: {
    position: "relative",
    minWidth: 0,
    borderRadius: radii.md,
    cursor: "pointer",
  },
  thumb: {
    position: "relative",
    aspectRatio: "16 / 10",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, [stylex.when.ancestor(":hover")]: colors.line2 },
    boxShadow: {
      default: "none",
      [stylex.when.ancestor(":hover")]: `inset 0 0 0 1.5px ${colors.accent}`,
    },
    backgroundColor: colors.bg,
  },
  fallback: { fontSize: 22, fontWeight: 600, color: colors.faint },
  buttons: {
    position: "absolute",
    left: 4,
    right: 4,
    bottom: 4,
    zIndex: 1,
    display: {
      default: "none",
      [stylex.when.ancestor(":hover")]: "flex",
      ":focus-within": "flex",
    },
    gap: 4,
  },
  button: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 20,
    padding: 0,
    borderWidth: 0,
    borderRadius: 5,
    backgroundColor: { default: "rgba(0, 0, 0, 0.65)", ":hover": "rgba(0, 0, 0, 0.85)" },
    color: { default: "#ddd", ":hover": colors.accent2 },
    fontSize: 10,
    cursor: "pointer",
  },
  name: {
    marginTop: 5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 11,
    color: colors.muted,
  },
});

/** An enter/exit animation preset: double-click sets it as the selection's In animation. */
export function AnimationTile({ preset }: { preset: AnimationPreset }) {
  const [hovered, setHovered] = useState(false);
  const reveal = preset.effectId ? BUILTIN_EFFECTS[preset.effectId] : undefined;

  return (
    <div
      title={`${preset.name}\nDouble-click to set as the selected clips' In animation`}
      onDoubleClick={() => animateSelection(preset.id, "in")}
      onContextMenu={(e) => openMenu(e, animationMenu(preset.id))}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      {...stylex.props(styles.tile, stylex.defaultMarker())}
    >
      <div {...stylex.props(styles.thumb)}>
        {preset.motion ? (
          <MotionPreview preset={preset} animate={hovered} />
        ) : reveal ? (
          <EffectThumb def={reveal} fallback={initialOf(preset.name)} animate={hovered} />
        ) : (
          <span {...stylex.props(styles.fallback)}>{initialOf(preset.name)}</span>
        )}
        <div {...stylex.props(styles.buttons)}>
          {(["in", "out"] as const).map((which) => (
            <button
              key={which}
              type="button"
              title={`Set as the selected clips' ${which === "in" ? "In" : "Out"} animation`}
              onDoubleClick={(e) => e.stopPropagation()}
              onClick={() => animateSelection(preset.id, which)}
              {...stylex.props(styles.button)}
            >
              {which === "in" ? "Set as In" : "Set as Out"}
            </button>
          ))}
        </div>
      </div>
      <div {...stylex.props(styles.name)}>{preset.name}</div>
    </div>
  );
}
