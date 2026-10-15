import * as stylex from "@stylexjs/stylex";
import { Fragment } from "react";
import { Button } from "../controls/Button";
import { Kbd } from "../controls/Kbd";
import { colors } from "../theme/tokens.stylex";
import { Dialog } from "./Dialog";

const mod = navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl+";
const GROUPS = [
  [
    "Project",
    [
      ["Open files", `${mod}O`],
      ["Save project", `${mod}S`],
      ["Undo", `${mod}Z`],
      ["Redo", `⇧${mod}Z`],
      ["Keyboard shortcuts", "?"],
    ],
  ],
  [
    "Playback",
    [
      ["Play / pause", "Space"],
      ["Pause", "K"],
      ["Previous / next frame", "← / →"],
      ["Previous / next second", "⇧← / ⇧→"],
      ["Go to start / end", "Home / End"],
      ["Loop playback", "L"],
    ],
  ],
  [
    "Timeline",
    [
      ["Select / blade tool", "V / B"],
      ["Split at playhead", "S"],
      ["Delete selection", "⌫"],
      ["Ripple delete", "⇧⌫"],
      ["Toggle snapping", "N"],
      ["Zoom in / out", "+ / −"],
      ["Add marker", "M"],
    ],
  ],
  [
    "Clips & titles",
    [
      ["Select all / deselect", `${mod}A / Esc`],
      ["Copy / paste", `${mod}C / ${mod}V`],
      ["Duplicate", `${mod}D`],
      ["Add title", "T"],
      ["Edit selected title", "Enter"],
      ["Freeze frame", "F"],
      ["Move selected layer", "Drag"],
    ],
  ],
] as const;

const styles = stylex.create({
  intro: { margin: 0, color: colors.muted, fontSize: 12, lineHeight: 1.7 },
  grid: {
    display: "grid",
    gridTemplateColumns: { default: "1fr 1fr", "@media (max-width: 599px)": "1fr" },
    gap: 24,
    paddingBlock: 8,
  },
  heading: { marginTop: 0, marginBottom: 12, fontSize: 12, fontWeight: 600, color: colors.text },
  list: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 9,
    margin: 0,
    color: colors.muted,
    fontSize: 11.5,
  },
  keys: { margin: 0, textAlign: "right" },
});

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      title="Keyboard shortcuts"
      onClose={onClose}
      wide
      footer={<Button onClick={onClose}>Done</Button>}
      note="Cutline · Help"
    >
      <p {...stylex.props(styles.intro)}>
        Keep your hands on the keyboard. Shortcuts are paused while you type or use a dialog.
      </p>
      <div {...stylex.props(styles.grid)}>
        {GROUPS.map(([title, shortcuts]) => (
          <section key={title}>
            <h3 {...stylex.props(styles.heading)}>{title}</h3>
            <dl {...stylex.props(styles.list)}>
              {shortcuts.map(([label, keys]) => (
                <Fragment key={label}>
                  <dt>{label}</dt>
                  <dd {...stylex.props(styles.keys)}>
                    <Kbd>{keys}</Kbd>
                  </dd>
                </Fragment>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p {...stylex.props(styles.intro)}>
        Double-click a title to edit it on the canvas. Save a <strong>.cutline</strong> file to keep
        your timeline and source media together; Open brings it back. Export creates the finished
        video.
      </p>
    </Dialog>
  );
}
