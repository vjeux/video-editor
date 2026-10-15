import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { importFiles } from "../../app/assets";
import { colors, radii } from "../theme/tokens.stylex";
import { ACCEPTED_FILES } from "./dnd";

const styles = stylex.create({
  zone: {
    flexShrink: 0,
    height: 64,
    marginTop: 0,
    marginInline: 12,
    marginBottom: 12,
    display: "grid",
    placeItems: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: { default: colors.line2, ":hover": colors.accent },
    backgroundColor: "transparent",
    color: { default: colors.faint, ":hover": colors.muted },
    fontSize: 12,
    textAlign: "center",
    cursor: "pointer",
  },
  link: { color: colors.muted, textDecoration: "underline" },
});

/** Import affordance: opens the native file picker (files dropped on the app are handled globally). */
export function ImportDropZone() {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} {...stylex.props(styles.zone)}>
        <span>
          Drop files here
          <br />
          or <span {...stylex.props(styles.link)}>browse</span>
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
