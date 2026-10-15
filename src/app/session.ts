import type { Project } from "../core/types";
import {
  deleteMedia,
  loadMedia,
  loadProject,
  saveProject,
  storedMediaIds,
} from "../engine/persistence";
import { editorStore, mediaStore } from "../store";
import { sessionStore } from "../store/session";
import { openAsset } from "./assets";
import { reportError } from "./errors";

const AUTOSAVE_DELAY = 500;

export async function restoreSession() {
  const saved = await loadProject();
  if (!saved) return;
  editorStore.getState().load(saved);
  sessionStore.setState({ savedAt: Date.now() });

  const referenced = new Set(Object.keys(saved.assets));
  for (const id of await storedMediaIds()) {
    if (!referenced.has(id)) void deleteMedia(id);
  }
  await Promise.all(
    Object.values(saved.assets).map(async (asset) => {
      mediaStore.getState().patch(asset.id, { status: "loading" });
      const file = await loadMedia(asset.id);
      if (file) await openAsset(asset, file);
      else mediaStore.getState().patch(asset.id, { status: "missing" });
    }),
  );
}

export function startAutosave(): () => void {
  let timer = 0;
  const save = (project: Project) => {
    sessionStore.setState({ saving: true });
    saveProject(project)
      .then(() => sessionStore.setState({ saving: false, savedAt: Date.now() }))
      .catch(reportError);
  };
  return editorStore.subscribe((s, prev) => {
    if (s.project === prev.project) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => save(s.project), AUTOSAVE_DELAY);
  });
}
