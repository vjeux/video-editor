import * as stylex from "@stylexjs/stylex";
import { deleteSelection } from "../../app/commands";
import { useEditor } from "../../store";
import { IconButton } from "../controls/IconButton";
import { PanelHeader } from "../controls/PanelHeader";
import { colors } from "../theme/tokens.stylex";
import { ClipHeader } from "./ClipHeader";
import { MediaInspector } from "./MediaInspector";
import { ProjectInspector } from "./ProjectInspector";
import { SelectionSummary } from "./SelectionSummary";
import { TextInspector } from "./TextInspector";

const styles = stylex.create({
  root: {
    height: "100%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: colors.panel,
  },
  body: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minHeight: 0,
    minWidth: 0,
    overflowX: "hidden",
    overflowY: "auto",
  },
});

export function Inspector() {
  const count = useEditor((s) => s.selection.length);
  const clip = useEditor((s) =>
    s.selection.length === 1 ? s.project.clips[s.selection[0] ?? ""] : undefined,
  );
  const title = clip ? "Inspector" : count > 1 ? "Selection" : "Project";

  return (
    <aside aria-label="Inspector" {...stylex.props(styles.root)}>
      <PanelHeader title={title}>
        {count > 0 && (
          <IconButton
            icon="trash"
            size={14}
            small
            title="Delete selection (⌫)"
            onClick={() => deleteSelection()}
          />
        )}
      </PanelHeader>
      <div {...stylex.props(styles.body)}>
        {clip ? (
          <>
            <ClipHeader clip={clip} />
            {clip.type === "text" ? <TextInspector clip={clip} /> : <MediaInspector clip={clip} />}
          </>
        ) : count > 1 ? (
          <SelectionSummary count={count} />
        ) : (
          <ProjectInspector />
        )}
      </div>
    </aside>
  );
}
