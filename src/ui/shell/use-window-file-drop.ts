import { useEffect, useState } from "react";
import { openFiles } from "../../app/project-files";
import { reportError } from "../../app/errors";

const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files") ?? false;

/** Imports files dropped anywhere outside the timeline; returns whether a drag is hovering. */
export function useWindowFileDrop(): boolean {
  const [over, setOver] = useState(false);
  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setOver(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      depth = 0;
      setOver(false);
      if (!hasFiles(e)) return;
      e.preventDefault();
      const files = [...(e.dataTransfer?.files ?? [])];
      void openFiles(files).catch(reportError);
    };
    const listeners = { dragenter: enter, dragleave: leave, dragover: over, drop } as const;
    for (const [type, fn] of Object.entries(listeners))
      window.addEventListener(type, fn as EventListener);
    return () => {
      for (const [type, fn] of Object.entries(listeners))
        window.removeEventListener(type, fn as EventListener);
    };
  }, []);
  return over;
}
