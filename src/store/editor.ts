import type { StoreApi } from "zustand/vanilla";
import type { Id, Project } from "../core/types";

export type Tool = "select" | "blade";

export interface EditorState {
  project: Project;
  past: Project[];
  future: Project[];
  coalesceKey: string | null;
  selection: Id[];
  playhead: number;
  playing: boolean;
  pxPerSecond: number;
  snapping: boolean;
  loop: boolean;
  tool: Tool;
  monitorVolume: number;

  commit(fn: (project: Project) => Project, opts?: { coalesce?: string }): void;
  undo(): void;
  redo(): void;
  load(project: Project): void;
  select(ids: Id[]): void;
  setPlayhead(t: number): void;
  setPlaying(playing: boolean): void;
  setView(
    patch: Partial<
      Pick<EditorState, "pxPerSecond" | "snapping" | "loop" | "tool" | "monitorVolume">
    >,
  ): void;
}

export type EditorStore = StoreApi<EditorState>;

export function createEditorStore(_initial: Project): EditorStore {
  throw new Error("not implemented");
}
