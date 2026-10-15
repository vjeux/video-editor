import { createStore, type StoreApi } from "zustand/vanilla";
import type { Id, Project } from "../core/types";

export type Tool = "select" | "blade";

const HISTORY_LIMIT = 200;

export interface EditorState {
  project: Project;
  past: Project[];
  future: Project[];
  coalesceKey: string | null;
  selection: Id[];
  /** Clip whose incoming transition is selected (mutually exclusive with `selection`). */
  focusedTransition: Id | null;
  playhead: number;
  playing: boolean;
  pxPerSecond: number;
  snapping: boolean;
  loop: boolean;
  tool: Tool;
  monitorVolume: number;

  commit: (fn: (project: Project) => Project, opts?: { coalesce?: string }) => void;
  undo: () => void;
  redo: () => void;
  load: (project: Project) => void;
  select: (ids: Id[]) => void;
  focusTransition: (clipId: Id) => void;
  setPlayhead: (t: number) => void;
  setPlaying: (playing: boolean) => void;
  setView: (
    patch: Partial<
      Pick<EditorState, "pxPerSecond" | "snapping" | "loop" | "tool" | "monitorVolume">
    >,
  ) => void;
}

export type EditorStore = StoreApi<EditorState>;

const existing = (project: Project, ids: Id[]) => ids.filter((id) => id in project.clips);

export function createEditorStore(initial: Project): EditorStore {
  return createStore<EditorState>()((set, get) => {
    /** The one place `project` is written; keeps selection consistent with it. */
    const setProject = (
      project: Project,
      history: Pick<EditorState, "past" | "future" | "coalesceKey">,
    ) => {
      const focused = get().focusedTransition;
      set({
        project,
        ...history,
        selection: existing(project, get().selection),
        focusedTransition: focused && focused in project.clips ? focused : null,
      });
    };

    return {
      project: initial,
      past: [],
      future: [],
      coalesceKey: null,
      selection: [],
      focusedTransition: null,
      playhead: 0,
      playing: false,
      pxPerSecond: 40,
      snapping: true,
      loop: false,
      tool: "select",
      monitorVolume: 1,

      commit(fn, opts = {}) {
        const { project, past, coalesceKey } = get();
        const next = fn(project);
        if (next === project) return;
        const coalesce = opts.coalesce !== undefined && opts.coalesce === coalesceKey;
        setProject(next, {
          past: coalesce ? past : [...past, project].slice(-HISTORY_LIMIT),
          future: [],
          coalesceKey: opts.coalesce ?? null,
        });
      },

      undo() {
        const { project, past, future } = get();
        const previous = past.at(-1);
        if (!previous) return;
        setProject(previous, {
          past: past.slice(0, -1),
          future: [project, ...future],
          coalesceKey: null,
        });
      },

      redo() {
        const { project, past, future } = get();
        const [next, ...rest] = future;
        if (!next) return;
        setProject(next, { past: [...past, project], future: rest, coalesceKey: null });
      },

      load(project) {
        set({
          project,
          past: [],
          future: [],
          coalesceKey: null,
          selection: [],
          focusedTransition: null,
          playhead: 0,
          playing: false,
        });
      },

      focusTransition(clipId) {
        set({ selection: [], focusedTransition: clipId, coalesceKey: null });
      },

      select(ids) {
        set({
          selection: existing(get().project, ids),
          focusedTransition: null,
          coalesceKey: null,
        });
      },

      setPlayhead(t) {
        set({ playhead: Math.max(0, t) });
      },

      setPlaying(playing) {
        set({ playing });
      },

      setView(patch) {
        set(patch);
      },
    };
  });
}
