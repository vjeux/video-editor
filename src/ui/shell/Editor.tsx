import * as stylex from "@stylexjs/stylex";
import {
  Activity,
  startTransition,
  Suspense,
  use,
  useEffect,
  useState,
  ViewTransition,
} from "react";
import { installShortcuts } from "../../app/commands";
import { sessionRestored, startAutosave } from "../../app/session";
import { Inspector } from "../inspector/Inspector";
import { LibraryPanel } from "../library/LibraryPanel";
import { ContextMenu } from "../menu/ContextMenu";
import { DropOverlay } from "./DropOverlay";
import { studioStore, useStudio } from "../../store/studio";
import { EffectStudio, ExportDialog, preloadDialogs, ScriptDialog } from "./lazy-dialogs";
import { Notices } from "./Notices";
import { TimelineSplitter } from "./TimelineSplitter";
import { UnsupportedBanner } from "./UnsupportedBanner";
import { useWindowFileDrop } from "./use-window-file-drop";
import { colors } from "../theme/tokens.stylex";
import { Timeline } from "../timeline/Timeline";
import { TopBar } from "../topbar/TopBar";
import { Viewer } from "../viewer/Viewer";

const SUPPORTED = typeof VideoDecoder !== "undefined" && typeof VideoEncoder !== "undefined";
const DEFAULT_TIMELINE = 320;
const MIN_TIMELINE = 180;
const MIN_EDITOR = 260;

type Dialog = "export" | "script";

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

export function Editor() {
  use(sessionRestored());
  const [dialog, setDialog] = useState<Dialog | null>(null);
  /** Dialogs mount on first open (loading their chunk), then stay mounted. */
  const [opened, setOpened] = useState<ReadonlySet<Dialog>>(new Set());
  const [timelineHeight, setTimelineHeight] = useState(DEFAULT_TIMELINE);
  const dropping = useWindowFileDrop();
  const studioOpen = useStudio((s) => s.target !== null);

  useEffect(() => {
    const stopAutosave = startAutosave();
    const stopShortcuts = installShortcuts();
    const cancelPreload = preloadDialogs();
    return () => {
      cancelPreload();
      stopShortcuts();
      stopAutosave();
    };
  }, []);

  /** Dialogs open and close inside a transition so their ViewTransitions animate. */
  const show = (next: Dialog | null) =>
    startTransition(() => {
      setDialog(next);
      if (next) setOpened((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    });

  const resize = (height: number) =>
    setTimelineHeight(Math.min(window.innerHeight - MIN_EDITOR, Math.max(MIN_TIMELINE, height)));

  return (
    <div {...stylex.props(styles.app, styles.rows(timelineHeight))}>
      <div {...stylex.props(styles.cell, styles.top)}>
        <TopBar onExport={() => show("export")} onScript={() => show("script")} />
      </div>
      <div {...stylex.props(styles.cell, styles.media)}>
        <LibraryPanel />
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
      {/* Once opened, a dialog stays mounted while hidden: a script draft and its
          output survive closing, and an export keeps encoding in the background. */}
      <Suspense fallback={null}>
        {opened.has("export") && (
          <Activity mode={dialog === "export" ? "visible" : "hidden"}>
            <ViewTransition enter="dialog-enter" exit="dialog-exit">
              <ExportDialog onClose={() => show(null)} />
            </ViewTransition>
          </Activity>
        )}
        {opened.has("script") && (
          <Activity mode={dialog === "script" ? "visible" : "hidden"}>
            <ViewTransition enter="dialog-enter" exit="dialog-exit">
              <ScriptDialog onClose={() => show(null)} />
            </ViewTransition>
          </Activity>
        )}
        {/* The studio unmounts on close so its editor, timers and preview loop are released. */}
        {studioOpen && <EffectStudio onClose={() => studioStore.getState().close()} />}
      </Suspense>
      {dropping && <DropOverlay />}
      {!SUPPORTED && <UnsupportedBanner />}
      <ContextMenu />
      <Notices />
    </div>
  );
}
