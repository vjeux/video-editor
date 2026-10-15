import * as stylex from "@stylexjs/stylex";
import { colors, fonts, radii } from "../theme/tokens.stylex";
import { HOST_API } from "./host-api";

const styles = stylex.create({
  details: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.line,
    backgroundColor: colors.bg,
    fontSize: 12,
    lineHeight: 1.5,
    color: colors.muted,
  },
  summary: {
    paddingBlock: 8,
    paddingInline: 10,
    color: { default: colors.muted, ":hover": colors.text },
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    cursor: "pointer",
    userSelect: "none",
  },
  body: { display: "grid", gap: 10, paddingInline: 10, paddingBottom: 10 },
  heading: { margin: 0, color: colors.text, fontSize: 12, fontWeight: 600 },
  list: { margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 },
  code: { fontFamily: fonts.mono, fontSize: 11, color: colors.accent2, userSelect: "text" },
  block: {
    margin: 0,
    paddingBlock: 6,
    paddingInline: 8,
    borderRadius: radii.md,
    backgroundColor: colors.panel2,
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.text,
    whiteSpace: "pre-wrap",
    userSelect: "text",
  },
  text: { margin: 0 },
});

/** The shader contract: entry points, host API, parameter syntax and file tags. */
export function ShaderReference() {
  return (
    <details {...stylex.props(styles.details)}>
      <summary {...stylex.props(styles.summary)}>Shader reference</summary>
      <div {...stylex.props(styles.body)}>
        <h4 {...stylex.props(styles.heading)}>Entry point</h4>
        <p {...stylex.props(styles.text)}>
          Define <code {...stylex.props(styles.code)}>vec4 effect(vec2 uv)</code> for an effect or{" "}
          <code {...stylex.props(styles.code)}>vec4 transition(vec2 uv)</code> for a transition. uv
          runs 0–1 with the origin at the bottom left; the result is clamped to 0–1.
        </p>
        <h4 {...stylex.props(styles.heading)}>Provided</h4>
        <ul {...stylex.props(styles.list)}>
          {HOST_API.map((s) => (
            <li key={s.label}>
              <code {...stylex.props(styles.code)}>{s.signature}</code> — {s.info}
            </li>
          ))}
        </ul>
        <h4 {...stylex.props(styles.heading)}>Parameters</h4>
        <p {...stylex.props(styles.text)}>
          Uniforms become controls: float/int sliders, bool toggles, vec2 points and vec3 colours.
        </p>
        <pre {...stylex.props(styles.block)}>
          {"uniform float amount; // = 0.5, min: 0, max: 1, step: 0.01, label: Amount\n" +
            "uniform vec3 tint; // = vec3(1.0, 0.5, 0.2), label: Tint"}
        </pre>
        <h4 {...stylex.props(styles.heading)}>Shader files</h4>
        <p {...stylex.props(styles.text)}>
          Imported .glsl files can name themselves with comment tags; here the fields above win.
        </p>
        <pre {...stylex.props(styles.block)}>
          {
            "// @name Film burn\n// @category Stylize\n// @description Warm light leak\n// @author You"
          }
        </pre>
      </div>
    </details>
  );
}
