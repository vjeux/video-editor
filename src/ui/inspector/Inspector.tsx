import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { deleteSelection } from "../../app/commands";
import type { Clip } from "../../core/types";
import { useEditor } from "../../store";
import { IconButton } from "../controls/IconButton";
import { PanelHeader } from "../controls/PanelHeader";
import { colors } from "../theme/tokens.stylex";
import { AdjustmentInspector } from "./AdjustmentInspector";
import { ClipHeader } from "./ClipHeader";
import { MediaInspector } from "./MediaInspector";
import { ProjectInspector } from "./ProjectInspector";
import { SelectionSummary } from "./SelectionSummary";
import { TextInspector } from "./TextInspector";
import { TransitionInspector } from "./TransitionInspector";

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

const CLIP_INSPECTORS: { [K in Clip["type"]]: (clip: Extract<Clip, { type: K }>) => ReactNode } = {
  media: (clip) => <MediaInspector clip={clip} />,
  text: (clip) => <TextInspector clip={clip} />,
  adjustment: (clip) => <AdjustmentInspector clip={clip} />,
};

// Each entry is typed for its own clip type; the lookup can't correlate the union.
const inspectorFor = (clip: Clip) =>
  (CLIP_INSPECTORS[clip.type] as (clip: Clip) => ReactNode)(clip);

export function Inspector() {
  const count = useEditor((s) => s.selection.length);
  const clip = useEditor((s) =>
    s.selection.length === 1 ? s.project.clips[s.selection[0] ?? ""] : undefined,
  );
  const transitionId = useEditor((s) => s.focusedTransition);
  const title = clip
    ? "Inspector"
    : count > 1
      ? "Selection"
      : transitionId
        ? "Transition"
        : "Project";

  return (
    <aside aria-label="Inspector" {...stylex.props(styles.root)}>
      <PanelHeader title={title} icon="panelRight">
        {(count > 0 || transitionId) && (
          <IconButton
            icon="trash"
            size={14}
            small
            title={count > 0 ? "Delete selection (⌫)" : "Remove transition (⌫)"}
            onClick={() => deleteSelection()}
          />
        )}
      </PanelHeader>
      <div {...stylex.props(styles.body)}>
        {clip ? (
          <>
            <ClipHeader clip={clip} />
            {inspectorFor(clip)}
          </>
        ) : count > 1 ? (
          <SelectionSummary count={count} />
        ) : transitionId ? (
          <TransitionInspector clipId={transitionId} />
        ) : (
          <ProjectInspector />
        )}
      </div>
    </aside>
  );
}
