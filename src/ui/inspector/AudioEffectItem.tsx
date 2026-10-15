import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import {
  removeAudioEffectFrom,
  reorderAudioEffect,
  toggleAudioEffect,
  updateAudioEffectParams,
} from "../../app/audio-effects";
import { AUDIO_EFFECTS } from "../../core/audio-effects";
import type { EffectInstance, Id } from "../../core/types";
import { Icon } from "../controls/Icon";
import { IconButton } from "../controls/IconButton";
import { ParamControl } from "../controls/ParamControl";
import { Toggle } from "../controls/Toggle";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  item: {
    marginBottom: { default: 6, ":last-child": 0 },
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: colors.panel2,
    listStyle: "none",
  },
  header: {
    height: 32,
    display: "flex",
    alignItems: "center",
    gap: 4,
    paddingInlineStart: 4,
    paddingInlineEnd: 2,
  },
  title: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 26,
    display: "flex",
    alignItems: "center",
    gap: 6,
    paddingBlock: 0,
    paddingInline: 4,
    borderWidth: 0,
    borderRadius: radii.sm,
    backgroundColor: "transparent",
    color: colors.text,
    fontSize: 12,
    fontWeight: 550,
    textAlign: "start",
    cursor: "pointer",
  },
  name: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  caret: { transition: "transform 0.15s" },
  open: { transform: "rotate(90deg)" },
  off: { opacity: 0.5 },
  body: {
    paddingTop: 4,
    paddingInline: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.line,
  },
});

/** One entry of a clip's audio effect stack: toggle, reorder, remove and its parameters. */
export function AudioEffectItem({
  clipId,
  instance,
  index,
  count,
}: {
  clipId: Id;
  instance: EffectInstance;
  index: number;
  count: number;
}) {
  const [open, setOpen] = useState(true);
  const def = AUDIO_EFFECTS[instance.effectId];
  return (
    <li {...stylex.props(styles.item)}>
      <div {...stylex.props(styles.header)}>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          {...stylex.props(styles.title, !instance.enabled && styles.off)}
        >
          <span {...stylex.props(styles.caret, open && styles.open)}>
            <Icon name="next" size={10} />
          </span>
          <span {...stylex.props(styles.name)}>{def?.name ?? "Missing audio effect"}</span>
        </button>
        <Toggle
          label={`Enable ${def?.name ?? "effect"}`}
          on={instance.enabled}
          onChange={(on) => toggleAudioEffect(clipId, instance.id, on)}
        />
        <IconButton
          icon="prev"
          title="Move up"
          small
          size={11}
          disabled={index === 0}
          onClick={() => reorderAudioEffect(clipId, instance.id, index - 1)}
        />
        <IconButton
          icon="next"
          title="Move down"
          small
          size={11}
          disabled={index === count - 1}
          onClick={() => reorderAudioEffect(clipId, instance.id, index + 1)}
        />
        <IconButton
          icon="close"
          title="Remove"
          small
          size={11}
          onClick={() => removeAudioEffectFrom(clipId, instance.id)}
        />
      </div>
      {open && def && (
        <div {...stylex.props(styles.body)}>
          {def.params.map((param) => (
            <ParamControl
              key={param.key}
              def={param}
              value={instance.params[param.key]}
              onChange={(value, coalesce) =>
                updateAudioEffectParams(
                  clipId,
                  instance.id,
                  { [param.key]: value },
                  coalesce && `${instance.id}:${coalesce}`,
                )
              }
            />
          ))}
        </div>
      )}
    </li>
  );
}
