import * as stylex from "@stylexjs/stylex";
import { Icon } from "../controls/Icon";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  box: {
    flexShrink: 0,
    height: 30,
    marginTop: 10,
    marginInline: 12,
    marginBottom: 6,
    paddingBlock: 0,
    paddingInline: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, ":focus-within": colors.line2 },
    backgroundColor: colors.bg,
    color: colors.faint,
  },
  input: {
    flexGrow: 1,
    minWidth: 0,
    padding: 0,
    borderWidth: 0,
    outline: "none",
    backgroundColor: "transparent",
    color: colors.text,
    userSelect: "text",
  },
});

export function LibrarySearch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label {...stylex.props(styles.box)}>
      <Icon name="search" size={14} />
      <input
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...stylex.props(styles.input)}
      />
    </label>
  );
}
