import * as stylex from "@stylexjs/stylex";
import { reportError } from "../../app/errors";
import { importEffectFiles } from "../../app/effects";
import { colors, radii } from "../theme/tokens.stylex";

const ACCEPT = ".glsl,.frag,.fs,.json,.cube";

// Mirrors the default Button: a <label> is needed to open the hidden file input.
const styles = stylex.create({
  button: {
    height: 30,
    paddingBlock: 0,
    paddingInline: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: colors.line2, ":focus-within": colors.accent },
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    color: colors.text,
    backgroundColor: { default: "transparent", ":hover": colors.panel2 },
    cursor: "pointer",
  },
});

/** Imports shader, LUT and effect-pack files into the project; `onImported` runs if any landed. */
export function ImportButton({ onImported }: { onImported: () => void }) {
  return (
    <label
      title="Import .glsl/.frag shaders, .cube LUTs or Cutline effect packs"
      {...stylex.props(styles.button)}
    >
      Import…
      <input
        type="file"
        hidden
        multiple
        accept={ACCEPT}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length === 0) return;
          importEffectFiles(files)
            .then((imported) => imported.length > 0 && onImported())
            .catch(reportError);
        }}
      />
    </label>
  );
}
