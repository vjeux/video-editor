import * as stylex from "@stylexjs/stylex";
import { useState } from "react";
import {
  removeEffectFrom,
  reorderEffect,
  toggleEffect,
  updateEffectParams,
} from "../../app/effects";
import type { EffectInstance, Id } from "../../core/types";
import { resolveEffect } from "../../effects/resolve";
import { useEditor } from "../../store";
import { contextMenuStore, type MenuEntry } from "../../store/context-menu";
import { Icon } from "../controls/Icon";
import { IconButton } from "../controls/IconButton";
import { ParamControl } from "../controls/ParamControl";
import { Toggle } from "../controls/Toggle";
import { colors, radii } from "../theme/tokens.stylex";
import { INSTANCE_MIME, openInStudio, slotAt, studioLabel } from "./effect-stack";

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
  before: { boxShadow: `0 -4px 0 -2px ${colors.accent}` },
  after: { boxShadow: `0 4px 0 -2px ${colors.accent}` },
  header: {
    height: 32,
    display: "flex",
    alignItems: "center",
    gap: 4,
    paddingInlineStart: 4,
    paddingInlineEnd: 2,
    cursor: "grab",
  },
  title: {
    flexGrow: 1,
    flexShrink: 1,
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
  off: { color: colors.faint },
  missing: { color: colors.danger },
  caret: {
    display: "grid",
    flexShrink: 0,
    color: colors.faint,
    transition: "transform 0.15s",
  },
  caretOpen: { transform: "rotate(90deg)" },
  name: { minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  toggle: { display: "grid", flexShrink: 0, marginInline: 4 },
  body: {
    paddingBlock: 10,
    paddingInline: 10,
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.line,
  },
  hint: { margin: 0, fontSize: 11.5, lineHeight: 1.5, color: colors.faint },
});

/**
 * One entry of a clip's effect stack: enable toggle, name, Studio and remove
 * actions, and its parameters. Dragging the header reorders the stack.
 */
export function EffectStackItem({
  clipId,
  instance,
  index,
  count,
  indicator,
  onDragSlot,
  onDragEnd,
}: {
  clipId: Id;
  instance: EffectInstance;
  index: number;
  count: number;
  /** Where the reorder drop indicator is drawn relative to this item. */
  indicator: "before" | "after" | null;
  onDragSlot: (slot: number) => void;
  onDragEnd: () => void;
}) {
  const def = useEditor((s) => resolveEffect(s.project, instance.effectId));
  const custom = useEditor((s) => instance.effectId in s.project.customEffects);
  const [open, setOpen] = useState(true);
  const name = def?.name ?? "Missing effect";
  const remove = () => removeEffectFrom(clipId, instance.id);
  const entries: MenuEntry[] = [
    ...(def
      ? [
          {
            kind: "item",
            label: studioLabel(custom),
            run: () => openInStudio(def.id, custom),
          } as const,
        ]
      : []),
    {
      kind: "item",
      label: "Move up",
      disabled: index === 0,
      run: () => reorderEffect(clipId, instance.id, index - 1),
    },
    {
      kind: "item",
      label: "Move down",
      disabled: index === count - 1,
      run: () => reorderEffect(clipId, instance.id, index + 1),
    },
    { kind: "separator" },
    { kind: "item", label: "Remove", danger: true, run: remove },
  ];

  return (
    <li
      aria-label={name}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(INSTANCE_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragSlot(slotAt(index, e.clientY, e.currentTarget.getBoundingClientRect()));
      }}
      {...stylex.props(
        styles.item,
        indicator === "before" && styles.before,
        indicator === "after" && styles.after,
      )}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(INSTANCE_MIME, instance.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={onDragEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          contextMenuStore.getState().open({ x: e.clientX, y: e.clientY, entries });
        }}
        {...stylex.props(styles.header)}
      >
        <button
          type="button"
          aria-expanded={open}
          title={def?.description ?? `Unknown effect “${instance.effectId}”`}
          onClick={() => setOpen(!open)}
          {...stylex.props(styles.title, !instance.enabled && styles.off, !def && styles.missing)}
        >
          <span {...stylex.props(styles.caret, open && styles.caretOpen)}>
            <Icon name="next" size={9} />
          </span>
          <span {...stylex.props(styles.name)}>{name}</span>
        </button>
        <span {...stylex.props(styles.toggle)}>
          <Toggle
            label={`Enable ${name}`}
            on={instance.enabled}
            onChange={(on) => toggleEffect(clipId, instance.id, on)}
          />
        </span>
        {def && (
          <IconButton
            icon="code"
            size={13}
            small
            title={studioLabel(custom)}
            onClick={() => openInStudio(def.id, custom)}
          />
        )}
        <IconButton icon="trash" size={13} small title={`Remove ${name}`} onClick={remove} />
      </div>
      {open && (
        <div {...stylex.props(styles.body)}>
          {!def && (
            <p {...stylex.props(styles.hint)}>
              “{instance.effectId}” is no longer available. Import it again or remove it.
            </p>
          )}
          {def?.params.length === 0 && (
            <p {...stylex.props(styles.hint)}>This effect has no settings.</p>
          )}
          {def?.params.map((p) => (
            <ParamControl
              key={p.key}
              def={p}
              value={instance.params[p.key]}
              onChange={(value, k) =>
                updateEffectParams(
                  clipId,
                  instance.id,
                  { [p.key]: value },
                  k && `${instance.id}:${k}`,
                )
              }
            />
          ))}
        </div>
      )}
    </li>
  );
}
