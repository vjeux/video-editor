import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { importFiles } from "../../app/assets";
import { reportError } from "../../app/errors";
import { pickFiles } from "../../app/source-files";
import { colors, motion, radii } from "../theme/tokens.stylex";
import { Icon } from "../controls/Icon";
import { ACCEPTED_FILES } from "./dnd";

const styles = stylex.create({
  zone: {
    flexShrink: 0,
    minHeight: 56,
    marginTop: 12,
    marginInline: 12,
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: { default: colors.accentRing, ":hover": colors.accent },
    backgroundColor: { default: colors.accentSoft, ":hover": colors.panel3 },
    color: { default: colors.accent2, ":hover": colors.text },
    fontSize: 12,
    textAlign: "center",
    cursor: "pointer",
    transitionProperty: "background-color, border-color, color",
    transitionDuration: motion.fast,
  },
  expanded: { minHeight: 104, flexDirection: "column", gap: 8 },
  title: { display: "block", fontWeight: 600, color: colors.text },
  hint: { display: "block", marginTop: 3, fontSize: 11, color: colors.muted },
});

/** Import affordance: opens the native file picker (files dropped on the app are handled globally). */
export function ImportDropZone({ expanded = false }: { expanded?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() =>
          void pickFiles(input.current)
            .then((files) => files && importFiles(files))
            .catch(reportError)
        }
        {...stylex.props(styles.zone, expanded && styles.expanded)}
      >
        <Icon name="upload" size={20} />
        <span>
          <span {...stylex.props(styles.title)}>Import files</span>
          <span {...stylex.props(styles.hint)}>Drop here or click to browse</span>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={ACCEPTED_FILES}
        onChange={(e) => {
          if (e.target.files) void importFiles([...e.target.files]);
          e.target.value = "";
        }}
      />
    </>
  );
}
