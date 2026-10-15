import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  group: { display: "flex", gap: 4, marginBottom: 12 },
  choice: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    flex: "1",
    minWidth: 0,
    minHeight: 52,
    paddingBlock: 7,
    paddingInline: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: { default: colors.field, ":hover": colors.fieldHover },
    color: colors.muted,
    cursor: "pointer",
    fontSize: 10,
  },
  active: {
    borderColor: colors.accent,
    backgroundColor: { default: colors.accentSoft, ":hover": colors.accentSoft },
    color: colors.accent2,
  },
});

/** Small, labelled visual choices with a single tab stop and arrow-key navigation. */
export function AppearancePresets<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "";
  options: readonly { value: T; label: string; preview: ReactNode }[];
  onChange: (value: T) => void;
}) {
  const selected = options.findIndex((option) => option.value === value);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      {...stylex.props(styles.group)}
      onKeyDown={(e) => {
        const direction = (
          { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>
        )[e.key];
        if (!direction) return;
        e.preventDefault();
        e.stopPropagation();
        const index = (Math.max(0, selected) + direction + options.length) % options.length;
        onChange(options[index]!.value);
        e.currentTarget.querySelectorAll<HTMLElement>("button")[index]?.focus();
      }}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={index === Math.max(0, selected) ? 0 : -1}
          onClick={() => onChange(option.value)}
          {...stylex.props(styles.choice, option.value === value && styles.active)}
        >
          <span aria-hidden>{option.preview}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}
