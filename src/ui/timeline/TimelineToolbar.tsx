import * as stylex from "@stylexjs/stylex";
import { addMarker, addText, deleteSelection, splitAtPlayhead } from "../../app/commands";
import { useEditor } from "../../store";
import { IconButton } from "../controls/IconButton";
import { Kbd } from "../controls/Kbd";
import { colors } from "../theme/tokens.stylex";
import { ImportMarkersButton } from "./ImportMarkersButton";
import { ZoomControl } from "./ZoomControl";

const styles = stylex.create({
  bar: {
    height: 40,
    flexShrink: 0,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 4,
    paddingBlock: 0,
    paddingInline: 10,
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.line,
  },
  sep: {
    width: 1,
    height: 18,
    flexShrink: 0,
    marginBlock: 0,
    marginInline: 6,
    backgroundColor: colors.line2,
  },
  tip: {
    display: { default: "block", "@media (max-width: 1100px)": "none" },
    flexShrink: 1,
    minWidth: 0,
    color: colors.faint,
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  grow: { flexGrow: 1, minWidth: 0 },
});

/** `width` is the visible lanes width, used by zoom-to-fit. */
export function TimelineToolbar({ width }: { width: number }) {
  const tool = useEditor((s) => s.tool);
  const snapping = useEditor((s) => s.snapping);
  const hasSelection = useEditor((s) => s.selection.length > 0);
  const setView = useEditor((s) => s.setView);
  return (
    <div {...stylex.props(styles.bar)}>
      <IconButton
        icon="pointer"
        title="Select (V)"
        on={tool === "select"}
        onClick={() => setView({ tool: "select" })}
        size={15}
      />
      <IconButton
        icon="blade"
        title="Blade (B)"
        on={tool === "blade"}
        onClick={() => setView({ tool: "blade" })}
        size={15}
      />
      <IconButton icon="split" title="Split at playhead (S)" onClick={splitAtPlayhead} size={15} />
      <IconButton icon="text" title="Add title (T)" onClick={() => addText()} size={15} />
      <div {...stylex.props(styles.sep)} />
      <IconButton
        icon="magnet"
        title="Snapping (N)"
        on={snapping}
        onClick={() => setView({ snapping: !snapping })}
        size={15}
      />
      <IconButton
        icon="ripple"
        title="Ripple delete selection (⇧⌫)"
        onClick={() => deleteSelection(true)}
        disabled={!hasSelection}
        size={15}
      />
      <IconButton icon="marker" title="Add marker (M)" onClick={addMarker} size={15} />
      <ImportMarkersButton />
      <div {...stylex.props(styles.sep)} />
      <span {...stylex.props(styles.tip)}>
        Space <Kbd>play</Kbd> · ← → <Kbd>frame</Kbd> · drag clips, edges to trim
      </span>
      <div {...stylex.props(styles.grow)} />
      <ZoomControl width={width} />
    </div>
  );
}
