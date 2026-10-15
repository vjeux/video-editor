import * as stylex from "@stylexjs/stylex";
import { projectDuration } from "../../core/timeline";
import { useEditor } from "../../store";
import { Button } from "../controls/Button";
import { Icon } from "../controls/Icon";
import { IconButton } from "../controls/IconButton";
import { colors, radii } from "../theme/tokens.stylex";
import { Brand } from "./Brand";
import { SavedStatus } from "./SavedStatus";

const styles = stylex.create({
  bar: {
    height: "100%",
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: { default: 16, "@media (max-width: 599px)": 8 },
    paddingBlock: 0,
    paddingInline: { default: 14, "@media (max-width: 599px)": 8 },
    overflow: "hidden",
    backgroundColor: colors.bg,
  },
  project: {
    flexShrink: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
    color: colors.muted,
  },
  name: {
    width: "22ch",
    minWidth: 40,
    flexShrink: 1,
    paddingBlock: 3,
    paddingInline: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: { default: "transparent", ":hover": colors.line2, ":focus": colors.accent },
    backgroundColor: { default: "transparent", ":focus": colors.panel },
    outline: "none",
    fontWeight: 500,
    textOverflow: "ellipsis",
    userSelect: "text",
  },
  grow: { flexGrow: 1 },
  /** Button text gives way to icons on phones. */
  label: { display: { default: "inline", "@media (max-width: 599px)": "none" } },
  saved: { display: { default: "contents", "@media (max-width: 599px)": "none" } },
  folder: { display: { default: "block", "@media (max-width: 599px)": "none" } },
  actions: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: { default: 6, "@media (max-width: 599px)": 2 },
  },
});

interface PanelToggles {
  library: boolean;
  inspector: boolean;
  toggle: (panel: "library" | "inspector") => void;
}

export function TopBar({
  onExport,
  onScript,
  panels,
}: {
  onExport: () => void;
  onScript: () => void;
  /** Present on narrow screens, where the side panels are slide-overs. */
  panels?: PanelToggles;
}) {
  const name = useEditor((s) => s.project.name);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const hasContent = useEditor((s) => projectDuration(s.project) > 0);
  const commit = useEditor((s) => s.commit);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);

  return (
    <header {...stylex.props(styles.bar)}>
      {panels && (
        <IconButton
          icon="panelLeft"
          title="Library"
          on={panels.library}
          onClick={() => panels.toggle("library")}
        />
      )}
      <Brand />
      <div {...stylex.props(styles.project)}>
        <span {...stylex.props(styles.folder)}>
          <Icon name="folder" size={14} />
        </span>
        <input
          aria-label="Project name"
          value={name}
          onChange={(e) =>
            commit((p) => ({ ...p, name: e.target.value }), { coalesce: "project-name" })
          }
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          {...stylex.props(styles.name)}
        />
        <span {...stylex.props(styles.saved)}>
          <SavedStatus />
        </span>
      </div>
      <div {...stylex.props(styles.grow)} />
      <div {...stylex.props(styles.actions)}>
        <IconButton icon="undo" title="Undo (⌘Z)" onClick={undo} disabled={!canUndo} />
        <IconButton icon="redo" title="Redo (⇧⌘Z)" onClick={redo} disabled={!canRedo} />
        <Button onClick={onScript} title="Edit the timeline with code">
          <Icon name="code" size={14} />
          <span {...stylex.props(styles.label)}>Script</span>
        </Button>
        <Button variant="primary" onClick={onExport} disabled={!hasContent} title="Export video">
          <Icon name="export" size={14} strokeWidth={2.2} />
          <span {...stylex.props(styles.label)}>Export</span>
        </Button>
        {panels && (
          <IconButton
            icon="panelRight"
            title="Inspector"
            on={panels.inspector}
            onClick={() => panels.toggle("inspector")}
          />
        )}
      </div>
    </header>
  );
}
