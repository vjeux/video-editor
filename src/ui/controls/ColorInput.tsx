import * as stylex from "@stylexjs/stylex";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  input: {
    width: 30,
    height: 24,
    flexShrink: 0,
    padding: 0,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: colors.bg,
    cursor: "pointer",
  },
});

/** Small native colour picker; `coalesce` groups a picker drag into one undo step. */
export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="color"
      aria-label={label}
      value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
      onChange={(e) => onChange(e.target.value)}
      {...stylex.props(styles.input)}
    />
  );
}
