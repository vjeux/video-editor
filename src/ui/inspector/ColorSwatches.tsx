import * as stylex from "@stylexjs/stylex";
import { ColorInput } from "../controls/ColorInput";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  swatches: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: 8,
    columnGap: 5,
    minWidth: 0,
  },
  swatch: {
    width: 18,
    height: 18,
    flexShrink: 0,
    padding: 0,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.15)",
    cursor: "pointer",
  },
  fill: (color: string) => ({ backgroundColor: color }),
  on: { boxShadow: `inset 0 0 0 2px ${colors.accent}, inset 0 0 0 3.5px ${colors.panel}` },
});

/** A palette of colour swatches plus an accessible picker for custom colours. */
export function ColorSwatches({
  value,
  onChange,
  palette,
  allowAlpha = false,
}: {
  value: string;
  onChange: (color: string, coalesce?: string) => void;
  palette: readonly string[];
  allowAlpha?: boolean;
}) {
  const current = value.toLowerCase();
  const isCustom = !palette.includes(current);
  return (
    <div {...stylex.props(styles.swatches)}>
      {palette.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Color ${c}`}
          aria-pressed={current === c}
          onClick={() => onChange(c)}
          onKeyDown={(e) => e.stopPropagation()}
          {...stylex.props(styles.swatch, styles.fill(c), current === c && styles.on)}
        />
      ))}
      <ColorInput
        label="Custom color"
        value={value}
        onChange={onChange}
        compact
        spectrum={!isCustom}
        allowAlpha={allowAlpha}
      />
    </div>
  );
}
