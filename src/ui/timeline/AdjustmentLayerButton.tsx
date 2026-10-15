import * as stylex from "@stylexjs/stylex";
import { addAdjustmentLayer } from "../../app/effects";
import { colors, radii } from "../theme/tokens.stylex";

const TITLE = "Add adjustment layer at playhead";

const styles = stylex.create({
  button: {
    width: 30,
    height: 30,
    flexShrink: 0,
    padding: 0,
    borderWidth: 0,
    borderRadius: radii.md,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    color: { default: colors.muted, ":hover": colors.text },
    backgroundColor: { default: "transparent", ":hover": colors.panel2 },
  },
});

/** Toolbar button adding an adjustment layer; drawn locally as the shared icon set has no glyph for it. */
export function AdjustmentLayerButton() {
  return (
    <button
      type="button"
      title={TITLE}
      aria-label={TITLE}
      onClick={() => addAdjustmentLayer()}
      {...stylex.props(styles.button)}
    >
      <svg
        width={15}
        height={15}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 3l9 5-9 5-9-5z" />
        <path d="M3 12.5l9 5 9-5" strokeDasharray="2.5 2.5" />
        <path d="M3 17l9 5 9-5" />
      </svg>
    </button>
  );
}
