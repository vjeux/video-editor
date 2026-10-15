import * as stylex from "@stylexjs/stylex";
import { type DragEvent, useState } from "react";
import { applyEffect, reorderEffect } from "../../app/effects";
import type { Clip } from "../../core/types";
import { EFFECT_MIME, effectKindMime } from "../effect-dnd";
import { Icon } from "../controls/Icon";
import { colors, radii } from "../theme/tokens.stylex";
import { EffectPicker } from "./EffectPicker";
import { EffectStackItem } from "./EffectStackItem";
import { INSTANCE_MIME, indexForSlot } from "./effect-stack";
import { Group } from "./Group";

const styles = stylex.create({
  zone: { borderRadius: radii.md, transition: "box-shadow 0.15s" },
  dropping: { boxShadow: `0 0 0 2px ${colors.accent}`, backgroundColor: colors.accentSoft },
  stack: { margin: 0, padding: 0 },
  empty: {
    margin: 0,
    paddingBlock: 14,
    paddingInline: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.line2,
    fontSize: 11.5,
    lineHeight: 1.5,
    color: colors.faint,
    textAlign: "center",
  },
  add: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    fontSize: 11,
    fontWeight: 500,
    textTransform: "none",
    letterSpacing: 0,
    color: { default: colors.accent2, ":hover": colors.text },
    cursor: "pointer",
  },
});

const hasType = (e: DragEvent, type: string) => e.dataTransfer.types.includes(type);

/** A clip's effect stack, applied top to bottom; accepts effects dropped from the library. */
export function EffectsGroup({ clip }: { clip: Clip }) {
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [slot, setSlot] = useState<number | null>(null);
  const { effects } = clip;
  const reset = () => {
    setAdding(false);
    setSlot(null);
  };
  const drop = (e: DragEvent) => {
    const instanceId = e.dataTransfer.getData(INSTANCE_MIME);
    const from = effects.findIndex((fx) => fx.id === instanceId);
    const effectId = e.dataTransfer.getData(EFFECT_MIME);
    if (from >= 0 && slot !== null) {
      reorderEffect(clip.id, instanceId, indexForSlot(from, slot));
    } else if (effectId) {
      applyEffect(effectId, [clip.id]);
    }
  };
  const indicatorFor = (index: number) =>
    slot === index
      ? "before"
      : slot === effects.length && index === effects.length - 1
        ? "after"
        : null;

  return (
    <Group
      title="Effects"
      action={
        <button
          type="button"
          aria-expanded={picking}
          onClick={() => setPicking(!picking)}
          {...stylex.props(styles.add)}
        >
          <Icon name={picking ? "close" : "plus"} size={12} />
          {picking ? "Close" : "Add effect"}
        </button>
      }
    >
      {picking && <EffectPicker clipId={clip.id} onClose={() => setPicking(false)} />}
      <div
        onDragOver={(e) => {
          if (hasType(e, effectKindMime("effect"))) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setAdding(true);
          } else if (hasType(e, INSTANCE_MIME)) {
            e.preventDefault();
          }
        }}
        onDragLeave={(e) => {
          const to = e.relatedTarget;
          if (!(to instanceof Node && e.currentTarget.contains(to))) reset();
        }}
        onDrop={(e) => {
          e.preventDefault();
          drop(e);
          reset();
        }}
        {...stylex.props(styles.zone, adding && styles.dropping)}
      >
        {effects.length === 0 ? (
          <p {...stylex.props(styles.empty)}>Drop an effect here, or use Add effect.</p>
        ) : (
          <ol aria-label="Effect stack" {...stylex.props(styles.stack)}>
            {effects.map((instance, i) => (
              <EffectStackItem
                key={instance.id}
                clipId={clip.id}
                instance={instance}
                index={i}
                count={effects.length}
                indicator={indicatorFor(i)}
                onDragSlot={setSlot}
                onDragEnd={reset}
              />
            ))}
          </ol>
        )}
      </div>
    </Group>
  );
}
