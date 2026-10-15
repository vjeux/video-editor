import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { Toggle } from "../controls/Toggle";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  row: { marginBottom: { default: 10, ":last-child": 0 } },
  head: { display: "flex", alignItems: "center", gap: 8, minHeight: 26 },
  label: { flexGrow: 1, color: colors.muted, fontSize: 12 },
  body: {
    marginTop: 6,
    paddingInlineStart: 8,
    borderInlineStartWidth: 2,
    borderInlineStartStyle: "solid",
    borderInlineStartColor: colors.line,
  },
});

/** A toggleable look: label, on/off, an inline control and settings when on. */
export function StyleEffectRow({
  label,
  on,
  onToggle,
  inline,
  children,
}: {
  label: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  /** Shown beside the toggle when on (e.g. a colour). */
  inline?: ReactNode;
  /** Settings shown under the row when on. */
  children?: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.row)}>
      <div {...stylex.props(styles.head)}>
        <span {...stylex.props(styles.label)}>{label}</span>
        {on && inline}
        <Toggle label={label} on={on} onChange={onToggle} />
      </div>
      {on && children && <div {...stylex.props(styles.body)}>{children}</div>}
    </div>
  );
}
