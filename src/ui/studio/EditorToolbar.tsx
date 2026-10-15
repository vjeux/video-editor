import * as stylex from "@stylexjs/stylex";
import type { EffectKind } from "../../core/types";
import { colors, radii } from "../theme/tokens.stylex";
import { ConfirmButton } from "./ConfirmButton";

const styles = stylex.create({
  bar: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  badge: {
    flexShrink: 0,
    paddingBlock: 3,
    paddingInline: 8,
    borderRadius: radii.pill,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  effect: { color: colors.accent2, backgroundColor: colors.accentSoft },
  transition: { color: colors.pink, backgroundColor: "rgba(255, 108, 181, 0.12)" },
  none: { color: colors.danger, backgroundColor: "rgba(255, 93, 108, 0.12)" },
  hint: {
    flexGrow: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.faint,
    fontSize: 11.5,
  },
});

const BADGES = {
  effect: { label: "Effect", hint: "vec4 effect(vec2 uv)", style: styles.effect },
  transition: { label: "Transition", hint: "vec4 transition(vec2 uv)", style: styles.transition },
} as const;

/** The kind the source implements (from its entry point) and template shortcuts. */
export function EditorToolbar({
  kind,
  empty,
  onTemplate,
}: {
  kind: EffectKind | null;
  /** An empty editor takes a template without asking. */
  empty: boolean;
  onTemplate: (kind: EffectKind) => void;
}) {
  const badge = kind ? BADGES[kind] : null;
  return (
    <div {...stylex.props(styles.bar)}>
      <span
        title="Derived from the entry point the source defines"
        {...stylex.props(styles.badge, badge?.style ?? styles.none)}
      >
        {badge?.label ?? "No entry point"}
      </span>
      <span {...stylex.props(styles.hint)}>
        {badge?.hint ?? "Define vec4 effect(vec2 uv) or vec4 transition(vec2 uv)"}
      </span>
      <ConfirmButton
        needsConfirm={!empty}
        confirmLabel="Replace your code?"
        title="Start over from the effect template"
        onConfirm={() => onTemplate("effect")}
      >
        Effect template
      </ConfirmButton>
      <ConfirmButton
        needsConfirm={!empty}
        confirmLabel="Replace your code?"
        title="Start over from the transition template"
        onConfirm={() => onTemplate("transition")}
      >
        Transition template
      </ConfirmButton>
    </div>
  );
}
