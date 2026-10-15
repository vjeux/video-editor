import * as stylex from "@stylexjs/stylex";
import { colors } from "../theme/tokens.stylex";

const styles = stylex.create({
  swatches: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: 8,
    columnGap: 7,
    minWidth: 0,
  },
  swatch: {
    width: 20,
    height: 20,
    flexShrink: 0,
    padding: 0,
    borderRadius: "50%",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255, 255, 255, 0.15)",
    cursor: "pointer",
  },
  fill: (color: string) => ({ backgroundColor: color }),
  on: { boxShadow: `inset 0 0 0 2px ${colors.accent}, inset 0 0 0 3.5px ${colors.panel}` },
  picker: {
    position: "relative",
    overflow: "hidden",
    backgroundImage: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
  },
  input: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
    cursor: "pointer",
  },
});

/** A palette of colour swatches plus a native picker for custom colours. */
export function ColorSwatches({
  value,
  onChange,
  palette,
}: {
  value: string;
  onChange: (color: string) => void;
  palette: readonly string[];
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
          {...stylex.props(styles.swatch, styles.fill(c), current === c && styles.on)}
        />
      ))}
      <label
        title="Custom color"
        {...stylex.props(styles.swatch, styles.picker, isCustom && styles.on)}
      >
        <input
          type="color"
          aria-label="Custom color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...stylex.props(styles.input)}
        />
      </label>
    </div>
  );
}
