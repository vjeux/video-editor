import { useStore } from "zustand";
import { createProject } from "../core/factories";
import { createEditorStore, type EditorState } from "./editor";
import { createMediaStore, type MediaState } from "./media";

export const editorStore = createEditorStore(createProject({ name: "Untitled project" }));
export const mediaStore = createMediaStore();

export const useEditor = <T>(selector: (state: EditorState) => T): T =>
  useStore(editorStore, selector);
export const useMedia = <T>(selector: (state: MediaState) => T): T =>
  useStore(mediaStore, selector);
