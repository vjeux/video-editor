import * as stylex from "@stylexjs/stylex";
import { colors, radii } from "../theme/tokens.stylex";
import { MEDIA_FILTERS, type MediaFilter } from "./filters";

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
    borderRadius: radii.sm,
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
    backgroundColor: colors.accentSoft,
    color: { default: colors.accent2, ":hover": colors.accent2 },
  },
});

export function FilterChips({
  value,
  onChange,
}: {
  value: MediaFilter;
  onChange: (value: MediaFilter) => void;
}) {
  return (
    <div role="group" aria-label="Filter by kind" {...stylex.props(styles.chips)}>
      {MEDIA_FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          aria-pressed={value === f.value}
          onClick={() => onChange(f.value)}
          {...stylex.props(styles.chip, value === f.value && styles.on)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
