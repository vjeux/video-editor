import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";
import { installShortcuts } from "./app/commands";
import { reportError } from "./app/errors";
import { restoreSession, startAutosave } from "./app/session";
import { ExportDialog } from "./ui/dialogs/ExportDialog";
import { ScriptDialog } from "./ui/dialogs/ScriptDialog";
import { Inspector } from "./ui/inspector/Inspector";
import { MediaBin } from "./ui/media/MediaBin";
import { ContextMenu } from "./ui/menu/ContextMenu";
import { DropOverlay } from "./ui/shell/DropOverlay";
import { Notices } from "./ui/shell/Notices";
import { TimelineSplitter } from "./ui/shell/TimelineSplitter";
import { UnsupportedBanner } from "./ui/shell/UnsupportedBanner";
import { useWindowFileDrop } from "./ui/shell/use-window-file-drop";
import { colors } from "./ui/theme/tokens.stylex";
import { Timeline } from "./ui/timeline/Timeline";
import { TopBar } from "./ui/topbar/TopBar";
import { Viewer } from "./ui/viewer/Viewer";

const SUPPORTED = typeof VideoDecoder !== "undefined" && typeof VideoEncoder !== "undefined";
const DEFAULT_TIMELINE = 320;
const MIN_TIMELINE = 180;
const MIN_EDITOR = 260;

type Dialog = "export" | "script" | null;

const styles = stylex.create({
  app: {
    height: "100vh",
    display: "grid",
    gridTemplateColumns: {
      default: "260px minmax(0, 1fr) 290px",
      "@media (max-width: 1100px)": "210px minmax(0, 1fr) 250px",
    },
    gap: 1,
    overflow: "hidden",
    backgroundColor: colors.line,
  },
  rows: (timeline: number) => ({ gridTemplateRows: `48px minmax(0, 1fr) ${timeline}px` }),
  cell: { minWidth: 0, minHeight: 0, overflow: "hidden" },
  top: { gridRow: 1, gridColumnStart: 1, gridColumnEnd: -1 },
  media: { gridRow: 2, gridColumn: 1 },
  viewer: { gridRow: 2, gridColumn: 2 },
  inspector: { gridRow: 2, gridColumn: 3 },
  timeline: {
    gridRow: 3,
    gridColumnStart: 1,
    gridColumnEnd: -1,
    position: "relative",
    overflow: "visible",
  },
});

export function App() {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [timelineHeight, setTimelineHeight] = useState(DEFAULT_TIMELINE);
  const dropping = useWindowFileDrop();

  useEffect(() => {
    let stopAutosave = () => {};
    restoreSession()
      .catch(reportError)
      .finally(() => (stopAutosave = startAutosave()));
    const stopShortcuts = installShortcuts();
    return () => {
      stopShortcuts();
      stopAutosave();
    };
  }, []);

  const resize = (height: number) =>
    setTimelineHeight(Math.min(window.innerHeight - MIN_EDITOR, Math.max(MIN_TIMELINE, height)));

  return (
    <div {...stylex.props(styles.app, styles.rows(timelineHeight))}>
      <div {...stylex.props(styles.cell, styles.top)}>
        <TopBar onExport={() => setDialog("export")} onScript={() => setDialog("script")} />
      </div>
      <div {...stylex.props(styles.cell, styles.media)}>
        <MediaBin />
      </div>
      <div {...stylex.props(styles.cell, styles.viewer)}>
        <Viewer />
      </div>
      <div {...stylex.props(styles.cell, styles.inspector)}>
        <Inspector />
      </div>
      <div {...stylex.props(styles.cell, styles.timeline)}>
        <TimelineSplitter
          height={timelineHeight}
          onResize={resize}
          onReset={() => setTimelineHeight(DEFAULT_TIMELINE)}
        />
        <Timeline />
      </div>
      {dialog === "export" && <ExportDialog onClose={() => setDialog(null)} />}
      {dialog === "script" && <ScriptDialog onClose={() => setDialog(null)} />}
      {dropping && <DropOverlay />}
      {!SUPPORTED && <UnsupportedBanner />}
      <ContextMenu />
      <Notices />
    </div>
  );
}
