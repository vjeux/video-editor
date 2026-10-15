import * as stylex from "@stylexjs/stylex";
import { importMarkers } from "../../app/commands";
import { reportError } from "../../app/errors";
import { noticeStore } from "../../store/notices";
import { Icon } from "../controls/Icon";
import { colors, radii } from "../theme/tokens.stylex";

const TITLE = "Import markers from chapters, CSV, SRT/VTT or LiveSplit (.lss)";

const styles = stylex.create({
  button: {
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius: radii.md,
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    color: { default: colors.muted, ":hover": colors.text },
    backgroundColor: { default: "transparent", ":hover": colors.panel2 },
  },
});

/** Icon button opening a file picker for marker lists. */
export function ImportMarkersButton() {
  return (
    <label title={TITLE} aria-label={TITLE} {...stylex.props(styles.button)}>
      <Icon name="upload" size={15} />
      <input
        type="file"
        hidden
        accept=".txt,.csv,.tsv,.srt,.vtt,.lss,.xml"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file)
            importMarkers(file)
              .then((n) =>
                noticeStore.getState().push("info", `Imported ${n} markers from ${file.name}`),
              )
              .catch(reportError);
        }}
      />
    </label>
  );
}
