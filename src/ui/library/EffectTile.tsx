import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import { openMenu } from "../../app/menus";
import type { EffectDefinition } from "../../core/types";
import { EFFECT_MIME, effectKindMime } from "../effect-dnd";
import { colors, radii } from "../theme/tokens.stylex";
import { KIND_ACTIONS } from "./actions";
import { initialOf } from "./catalog";
import { EffectThumb } from "./EffectThumb";

const styles = stylex.create({
  tile: {
    position: "relative",
    minWidth: 0,
    borderRadius: radii.md,
    cursor: "grab",
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
  badge: {
    position: "absolute",
    left: 4,
    bottom: 4,
    paddingBlock: 1,
    paddingInline: 4,
    borderRadius: 3,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: colors.accent2,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
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

/** A library entry for an effect or transition: drag it, double-click it, or right-click it. */
export function EffectTile({ def, custom }: { def: EffectDefinition; custom: boolean }) {
  const [hovered, setHovered] = useState(false);
  const actions = KIND_ACTIONS[def.kind];
  const about = def.description ? `\n${def.description}` : "";

  return (
    <div
      draggable
      title={`${def.name}${about}\n${actions.hint}`}
      onDragStart={(e) => {
        e.dataTransfer.setData(EFFECT_MIME, def.id);
        e.dataTransfer.setData(effectKindMime(def.kind), def.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onDoubleClick={() => actions.apply(def.id)}
      onContextMenu={(e) => openMenu(e, actions.menu(def, custom))}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      {...stylex.props(styles.tile, stylex.defaultMarker())}
    >
      <div {...stylex.props(styles.thumb)}>
        <EffectThumb def={def} fallback={initialOf(def.category)} animate={hovered} />
        {custom && <span {...stylex.props(styles.badge)}>Custom</span>}
      </div>
      <div {...stylex.props(styles.name)}>{def.name}</div>
    </div>
  );
}
