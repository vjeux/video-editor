import * as stylex from "@stylexjs/stylex";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  chips: {
    flexShrink: 0,
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 4,
    paddingInline: 12,
    paddingBottom: 10,
  },
  chip: {
    paddingBlock: 3,
    paddingInline: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line2,
    backgroundColor: "transparent",
    color: { default: colors.muted, ":hover": colors.text },
    fontSize: 11,
    cursor: "pointer",
  },
  on: {
    borderColor: "transparent",
    backgroundColor: colors.text,
    color: { default: colors.bg, ":hover": colors.bg },
  },
});

export function CategoryChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label="Filter by category" {...stylex.props(styles.chips)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          {...stylex.props(styles.chip, value === o.value && styles.on)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
