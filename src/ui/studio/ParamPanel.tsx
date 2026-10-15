import * as stylex from "@stylexjs/stylex";
import type { ParamDef, ParamValue, Params } from "../../core/types";
import { ParamControl } from "../controls/ParamControl";
import { colors, fonts } from "../theme/tokens.stylex";

const styles = stylex.create({
  panel: { display: "grid", gap: 10 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: {
    margin: 0,
    color: colors.muted,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  reset: {
    padding: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    fontSize: 11.5,
    color: { default: colors.faint, ":hover:enabled": colors.text },
    cursor: { default: "pointer", ":disabled": "default" },
    opacity: { default: 1, ":disabled": 0.5 },
  },
  empty: { margin: 0, color: colors.faint, fontSize: 12, lineHeight: 1.5 },
  code: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted },
});

/** Live controls for the shader's uniforms; values are preview-only, never saved. */
export function ParamPanel({
  defs,
  values,
  tweaked,
  onChange,
  onReset,
}: {
  defs: readonly ParamDef[];
  values: Params;
  tweaked: boolean;
  onChange: (key: string, value: ParamValue) => void;
  onReset: () => void;
}) {
  return (
    <section aria-label="Parameters" {...stylex.props(styles.panel)}>
      <div {...stylex.props(styles.header)}>
        <h3 {...stylex.props(styles.title)}>Parameters</h3>
        <button
          type="button"
          disabled={!tweaked}
          title="Back to the defaults declared in the source"
          onClick={onReset}
          {...stylex.props(styles.reset)}
        >
          Reset
        </button>
      </div>
      {defs.length === 0 ? (
        <p {...stylex.props(styles.empty)}>
          Declare a uniform to get a control, e.g.{" "}
          <code {...stylex.props(styles.code)}>uniform float amount; // = 0.5, min: 0, max: 1</code>
        </p>
      ) : (
        <div>
          {defs.map((def) => (
            <ParamControl
              key={def.key}
              def={def}
              value={values[def.key]}
              onChange={(value) => onChange(def.key, value)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
