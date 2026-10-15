import * as stylex from "@stylexjs/stylex";
import { useId } from "react";
import type { ExportFormat } from "../../engine/export";
import { Icon } from "../controls/Icon";
import { colors, motion, radii, shadows } from "../theme/tokens.stylex";

const FORMATS = [
  {
    value: "mp4",
    name: "MP4",
    description: "Best for sharing",
    detail: "Widely supported by apps and devices.",
  },
  {
    value: "webm",
    name: "WebM",
    description: "Made for the web",
    detail: "An open format for browsers and websites.",
  },
] as const;

const styles = stylex.create({
  group: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
  card: {
    position: "relative",
    minWidth: 0,
    display: "grid",
    gap: 5,
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line, ":hover": colors.line2, ":focus-within": colors.accent },
    backgroundColor: { default: colors.panel, ":hover": colors.panel2 },
    boxShadow: { default: "none", ":focus-within": shadows.ring },
    cursor: "pointer",
    transitionProperty: "border-color, background-color, box-shadow",
    transitionDuration: motion.fast,
  },
  selected: {
    borderColor: { default: colors.accent, ":hover": colors.accent },
    backgroundColor: { default: colors.accentSoft, ":hover": colors.accentSoft },
  },
  disabled: { opacity: 0.45, cursor: "not-allowed" },
  input: { position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", margin: 0 },
  heading: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 17, fontWeight: 650, color: colors.text },
  indicator: {
    width: 18,
    height: 18,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line2,
  },
  checked: { borderColor: colors.accent, backgroundColor: colors.accent, color: colors.onAccent },
  description: { fontSize: 12, fontWeight: 550, color: colors.text },
  detail: { color: colors.muted, fontSize: 11, lineHeight: 1.5 },
});

/** Native radios retain arrow-key navigation while the entire card is clickable. */
export function FormatPicker({
  value,
  onChange,
  supported,
}: {
  value: ExportFormat;
  onChange: (format: ExportFormat) => void;
  supported: Record<ExportFormat, boolean> | null;
}) {
  const group = useId();
  return (
    <div role="radiogroup" aria-label="Format" {...stylex.props(styles.group)}>
      {FORMATS.map((format) => {
        const selected = value === format.value;
        const disabled = !supported?.[format.value];
        return (
          <label
            key={format.value}
            {...stylex.props(styles.card, selected && styles.selected, disabled && styles.disabled)}
          >
            <input
              type="radio"
              name={group}
              value={format.value}
              checked={selected}
              disabled={disabled}
              aria-label={format.name}
              onChange={() => onChange(format.value)}
              {...stylex.props(styles.input)}
            />
            <span {...stylex.props(styles.heading)}>
              <span {...stylex.props(styles.name)}>{format.name}</span>
              <span aria-hidden {...stylex.props(styles.indicator, selected && styles.checked)}>
                {selected && <Icon name="check" size={12} strokeWidth={2.5} />}
              </span>
            </span>
            <span {...stylex.props(styles.description)}>{format.description}</span>
            <span {...stylex.props(styles.detail)}>
              {supported && disabled ? "Unavailable in this browser." : format.detail}
            </span>
          </label>
        );
      })}
    </div>
  );
}
