import { TaskProgress } from "./TaskProgress";

/** Encoding progress (0–1) with an optional ETA in seconds. */
export function ExportProgress({ progress, eta }: { progress: number; eta: number | null }) {
  const left = eta !== null ? ` · about ${Math.ceil(eta)}s left` : "";
  return (
    <TaskProgress
      label="Export progress"
      progress={progress}
      status={`Encoding ${Math.round(progress * 100)}%${left}`}
    />
  );
}
