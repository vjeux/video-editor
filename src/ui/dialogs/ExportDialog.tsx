import * as stylex from "@stylexjs/stylex";
import { startTransition, Suspense, useActionState, useRef, useState } from "react";
import { media } from "../../app/engine";
import { reportError } from "../../app/errors";
import { formatFps, formatTimecode } from "../../core/time";
import { projectDuration } from "../../core/timeline";
import {
  exportFileName,
  exportProject,
  type ExportFormat,
  type ExportQuality,
} from "../../engine/export";
import { editorStore, useEditor } from "../../store";
import { Button } from "../controls/Button";
import { Segmented } from "../controls/Segmented";
import { Select } from "../controls/Select";
import { colors, radii } from "../theme/tokens.stylex";
import { Dialog } from "./Dialog";
import { DialogField } from "./DialogField";
import { ExportProgress } from "./ExportProgress";
import { ExportSummary } from "./ExportSummary";
import { FormatPicker } from "./FormatPicker";

const QUALITY_OPTIONS: readonly { value: ExportQuality; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "very-high", label: "Max" },
];

type Result =
  | { kind: "idle" }
  | { kind: "done"; url: string; size: number; filename: string; seconds: number };

type Command =
  | { type: "export"; format: ExportFormat; quality: ExportQuality; height: number }
  | { type: "reset" };

interface Progress {
  progress: number;
  eta: number | null;
}

const IDLE: Result = { kind: "idle" };

const formatBytes = (bytes: number) =>
  bytes > 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : `${(bytes / 1e6).toFixed(1)} MB`;

const styles = stylex.create({
  result: { display: "grid", gap: 8 },
  video: {
    width: "100%",
    maxHeight: 240,
    borderRadius: radii.lg,
    backgroundColor: "#000",
  },
  hint: { margin: 0, color: colors.faint, fontSize: 11.5, lineHeight: 1.6 },
});

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const settings = useEditor((s) => s.project.settings);
  const duration = useEditor((s) => projectDuration(s.project));
  const [format, setFormat] = useState<ExportFormat>("mp4");
  const [quality, setQuality] = useState<ExportQuality>("high");
  const [chosenHeight, setHeight] = useState<number | null>(null);
  const [progress, setProgress] = useState<Progress>({ progress: 0, eta: null });
  const abort = useRef<AbortController | null>(null);
  const height = chosenHeight ?? settings.height;

  /**
   * The export is a React action: `exporting` is its pending flag, progress
   * streams in through plain state updates, and the result (or reset) is the
   * action state. No unmount abort: when the dialog is hidden by <Activity>
   * the export keeps running in the background.
   */
  const [result, dispatch, exporting] = useActionState<Result, Command>(
    async (previous, command) => {
      if (previous.kind === "done") URL.revokeObjectURL(previous.url);
      if (command.type === "reset") return IDLE;
      const controller = new AbortController();
      abort.current = controller;
      const startedAt = performance.now();
      setProgress({ progress: 0, eta: null });
      const project = editorStore.getState().project;
      try {
        const blob = await exportProject(project, media, {
          ...command,
          signal: controller.signal,
          onProgress: (p) => {
            const elapsed = (performance.now() - startedAt) / 1000;
            setProgress({ progress: p, eta: p > 0.02 ? elapsed * ((1 - p) / p) : null });
          },
        });
        return {
          kind: "done",
          url: URL.createObjectURL(blob),
          size: blob.size,
          filename: exportFileName(project, command.format),
          seconds: (performance.now() - startedAt) / 1000,
        };
      } catch (error) {
        reportError(error);
        return IDLE;
      }
    },
    IDLE,
  );

  const run = (command: Command) => startTransition(() => dispatch(command));
  const heights = [...new Set([settings.height, 2160, 1440, 1080, 720, 480])]
    .filter((h) => h <= Math.max(settings.height, 2160))
    .sort((a, b) => b - a);
  const width = (h: number) => Math.round(((settings.width / settings.height) * h) / 2) * 2;

  const footer =
    result.kind === "done" ? (
      <>
        <Button onClick={() => run({ type: "reset" })}>Export again</Button>
        <Button variant="primary" href={result.url} download={result.filename}>
          Download
        </Button>
      </>
    ) : exporting ? (
      <>
        <Button onClick={onClose} title="Keep exporting in the background">
          Hide
        </Button>
        <Button variant="danger" onClick={() => abort.current?.abort()}>
          Cancel
        </Button>
      </>
    ) : (
      <>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="primary"
          onClick={() => run({ type: "export", format, quality, height })}
          disabled={duration <= 0}
        >
          Export
        </Button>
      </>
    );

  return (
    <Dialog
      title="Export video"
      onClose={onClose}
      note="Powered by Mediabunny + WebCodecs"
      footer={footer}
    >
      <ExportSummary
        items={[
          { label: "Duration", value: formatTimecode(duration, settings.fps) },
          { label: "Resolution", value: `${width(height)}×${height}` },
          { label: "Frame rate", value: `${formatFps(settings.fps)} fps` },
        ]}
      />
      {result.kind === "done" ? (
        <div {...stylex.props(styles.result)}>
          <video src={result.url} controls {...stylex.props(styles.video)} />
          <p {...stylex.props(styles.hint)}>
            {formatBytes(result.size)} · rendered in {result.seconds.toFixed(1)}s, entirely on your
            device.
          </p>
        </div>
      ) : (
        <>
          <DialogField label="Format">
            <Suspense
              fallback={<p {...stylex.props(styles.hint)}>Checking this browser's encoders…</p>}
            >
              <FormatPicker value={format} onChange={setFormat} />
            </Suspense>
          </DialogField>
          <DialogField label="Resolution">
            <Select
              label="Resolution"
              value={String(height)}
              disabled={exporting}
              options={heights.map((h) => ({
                value: String(h),
                label: `${width(h)} × ${h}${h === settings.height ? " (project)" : ""}`,
              }))}
              onChange={(v) => setHeight(Number(v))}
            />
          </DialogField>
          <DialogField label="Quality">
            <Segmented
              label="Quality"
              value={quality}
              options={QUALITY_OPTIONS}
              onChange={setQuality}
            />
          </DialogField>
          {exporting && <ExportProgress progress={progress.progress} eta={progress.eta} />}
        </>
      )}
    </Dialog>
  );
}
