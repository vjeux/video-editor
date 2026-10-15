import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  group: {
    display: "flex",
    gap: 2,
    padding: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  option: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 22,
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.sm,
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    cursor: "pointer",
    color: { default: colors.muted, ":hover": colors.text },
    backgroundColor: "transparent",
  },
  compact: { fontSize: 10.5, paddingInline: 2 },
  on: { backgroundColor: colors.panel3, color: colors.text },
});

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  compact,
}: {
  value: T;
  options: readonly { value: T; label: ReactNode; title?: string }[];
  onChange: (value: T) => void;
  label: string;
  /** Tighter options for long rows such as speed presets. */
  compact?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} {...stylex.props(styles.group)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
          {...stylex.props(
            styles.option,
            compact && styles.compact,
            o.value === value && styles.on,
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
