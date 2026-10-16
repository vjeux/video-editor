import * as stylex from "@stylexjs/stylex";
import { useRef } from "react";
import { importFiles } from "../../app/assets";
import { reportError } from "../../app/errors";
import { pickFiles } from "../../app/source-files";
import { addText } from "../../app/commands";
import { Button } from "../controls/Button";
import { Icon } from "../controls/Icon";
import { ACCEPTED_FILES } from "../media/dnd";
import { colors, radii } from "../theme/tokens.stylex";

const styles = stylex.create({
  empty: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "safe center",
    gap: { default: 18, "@container preview (max-height: 240px)": 10 },
    overflowY: "auto",
    padding: 20,
    textAlign: "center",
    backgroundImage: `radial-gradient(ellipse at 50% 45%, ${colors.accentSoft}, transparent 65%)`,
  },
  mark: {
    width: 64,
    height: 64,
    display: { default: "grid", "@container preview (max-height: 300px)": "none" },
    placeItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.accentRing,
    backgroundColor: colors.panel2,
    color: colors.accent2,
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
    transform: "rotate(-6deg)",
  },
  title: {
    margin: 0,
    color: colors.text,
    fontSize: { default: 24, "@container preview (max-width: 480px)": 20 },
    fontWeight: 600,
    letterSpacing: "-0.7px",
    lineHeight: 1.25,
  },
  description: {
    display: { default: "block", "@container preview (max-height: 180px)": "none" },
    marginTop: 10,
    marginBottom: 0,
    maxWidth: 320,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 1.7,
  },
  actions: { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  note: {
    display: { default: "flex", "@container preview (max-height: 240px)": "none" },
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    color: colors.faint,
    fontSize: 11,
    borderRadius: radii.pill,
  },
});

/** A useful first step, even when the media library is tucked into a drawer. */
export function EmptyPreview() {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div {...stylex.props(styles.empty)}>
      <div aria-hidden {...stylex.props(styles.mark)}>
        <Icon name="film" size={28} strokeWidth={1.4} />
      </div>
      <div>
        <h2 {...stylex.props(styles.title)}>Your next story starts here.</h2>
        <p {...stylex.props(styles.description)}>
          Bring in your footage, find your favorite moments, and make them yours.
        </p>
      </div>
      <div {...stylex.props(styles.actions)}>
        <Button
          variant="primary"
          onClick={() =>
            void pickFiles(input.current)
              .then((files) => files && importFiles(files, { start: 0 }))
              .catch(reportError)
          }
        >
          <Icon name="plus" size={15} />
          Import media
        </Button>
        <Button onClick={() => addText()}>
          <Icon name="text" size={15} />
          Start with a title
        </Button>
      </div>
      <span {...stylex.props(styles.note)}>
        <Icon name="lock" size={11} />
        All yours. Everything stays on your device.
      </span>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept={ACCEPTED_FILES}
        onChange={(e) => {
          if (e.target.files) void importFiles([...e.target.files], { start: 0 });
          e.target.value = "";
        }}
      />
    </div>
  );
}
