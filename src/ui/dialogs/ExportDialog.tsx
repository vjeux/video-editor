import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef, useState } from "react";
import { media } from "../../app/engine";
import { reportError } from "../../app/errors";
import { formatTimecode } from "../../core/time";
import { projectDuration } from "../../core/timeline";
import {
  EXPORT_FORMATS,
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

const FORMAT_OPTIONS = (Object.keys(EXPORT_FORMATS) as ExportFormat[]).map((f) => ({
  value: f,
  label: EXPORT_FORMATS[f].label,
}));

const QUALITY_OPTIONS: readonly { value: ExportQuality; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "very-high", label: "Max" },
];

type Phase =
  | { kind: "setup" }
  | { kind: "running"; progress: number; eta: number | null }
  | { kind: "done"; url: string; size: number; filename: string; seconds: number };

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
  const [height, setHeight] = useState(settings.height);
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const abort = useRef<AbortController | null>(null);

  const heights = [...new Set([settings.height, 2160, 1440, 1080, 720, 480])]
    .filter((h) => h <= Math.max(settings.height, 2160))
    .sort((a, b) => b - a);
  const width = (h: number) => Math.round(((settings.width / settings.height) * h) / 2) * 2;

  useEffect(() => () => abort.current?.abort(), []);

  const resultUrl = phase.kind === "done" ? phase.url : null;
  useEffect(() => (resultUrl ? () => URL.revokeObjectURL(resultUrl) : undefined), [resultUrl]);

  const start = async () => {
    const controller = new AbortController();
    abort.current = controller;
    const startedAt = performance.now();
    setPhase({ kind: "running", progress: 0, eta: null });
    try {
      const project = editorStore.getState().project;
      const blob = await exportProject(project, media, {
        format,
        quality,
        height,
        signal: controller.signal,
        onProgress: (progress) => {
          const elapsed = (performance.now() - startedAt) / 1000;
          const eta = progress > 0.02 ? elapsed * ((1 - progress) / progress) : null;
          setPhase({ kind: "running", progress, eta });
        },
      });
      setPhase({
        kind: "done",
        url: URL.createObjectURL(blob),
        size: blob.size,
        filename: exportFileName(project, format),
        seconds: (performance.now() - startedAt) / 1000,
      });
    } catch (error) {
      setPhase({ kind: "setup" });
      reportError(error);
    }
  };

  const running = phase.kind === "running";
  const cancel = () => abort.current?.abort();

  const footer =
    phase.kind === "done" ? (
      <>
        <Button onClick={() => setPhase({ kind: "setup" })}>Export again</Button>
        <Button variant="primary" href={phase.url} download={phase.filename}>
          Download
        </Button>
      </>
    ) : running ? (
      <Button variant="danger" onClick={cancel}>
        Cancel
      </Button>
    ) : (
      <>
        <Button onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={() => void start()} disabled={duration <= 0}>
          Export
        </Button>
      </>
    );

  return (
    <Dialog
      title="Export video"
      onClose={running ? cancel : onClose}
      dismissable={!running}
      note="Powered by Mediabunny + WebCodecs"
      footer={footer}
    >
      <ExportSummary
        items={[
          { label: "Duration", value: formatTimecode(duration, settings.fps) },
          { label: "Resolution", value: `${width(height)}×${height}` },
          { label: "Frame rate", value: `${settings.fps} fps` },
        ]}
      />
      {phase.kind === "done" ? (
        <div {...stylex.props(styles.result)}>
          <video src={phase.url} controls {...stylex.props(styles.video)} />
          <p {...stylex.props(styles.hint)}>
            {formatBytes(phase.size)} · rendered in {phase.seconds.toFixed(1)}s, entirely on your
            device.
          </p>
        </div>
      ) : (
        <>
          <DialogField label="Format">
            <Segmented
              label="Format"
              value={format}
              options={FORMAT_OPTIONS}
              onChange={setFormat}
            />
          </DialogField>
          <DialogField label="Resolution">
            <Select
              label="Resolution"
              value={height}
              disabled={running}
              onChange={(v) => setHeight(Number(v))}
            >
              {heights.map((h) => (
                <option key={h} value={h}>
                  {width(h)} × {h}
                  {h === settings.height ? " (project)" : ""}
                </option>
              ))}
            </Select>
          </DialogField>
          <DialogField label="Quality">
            <Segmented
              label="Quality"
              value={quality}
              options={QUALITY_OPTIONS}
              onChange={setQuality}
            />
          </DialogField>
          {phase.kind === "running" && <ExportProgress progress={phase.progress} eta={phase.eta} />}
        </>
      )}
    </Dialog>
  );
}
