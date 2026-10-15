import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  input: {
    width: "100%",
    minWidth: 0,
    height: 30,
    paddingBlock: 0,
    paddingInline: 9,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, ":focus": colors.accent },
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 12.5,
    outline: "none",
    "::placeholder": { color: colors.faint },
  },
});

/** Single-line text input, optionally suggesting values from a datalist. */
export function StudioTextField({
  label,
  value,
  onChange,
  placeholder,
  suggestions,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: readonly string[];
}) {
  const listId = useId();
  return (
    <>
      <input
        aria-label={label}
        value={value}
        placeholder={placeholder}
        list={suggestions ? listId : undefined}
        onChange={(e) => onChange(e.target.value)}
        {...stylex.props(styles.input)}
      />
      {suggestions && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </>
  );
}
