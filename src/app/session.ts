import { migrateProject } from "../core/migrate";
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

/**
 * Loads the saved project, then reopens its media in the background (the
 * bin shows each file's progress). Resolves once the project is in the store.
 */
async function restoreSession() {
  const raw = await loadProject();
  if (!raw) return;
  const saved = migrateProject(raw);
  editorStore.getState().load(saved);
  sessionStore.setState({ savedAt: Date.now() });

  const referenced = new Set(Object.keys(saved.assets));
  void storedMediaIds().then((ids) => {
    for (const id of ids) if (!referenced.has(id)) void deleteMedia(id);
  });
  for (const asset of Object.values(saved.assets)) {
    mediaStore.getState().patch(asset.id, { status: "loading" });
    void loadMedia(asset.id).then((file) =>
      file ? openAsset(asset, file) : mediaStore.getState().patch(asset.id, { status: "missing" }),
    );
  }
}

let restored: Promise<void> | null = null;

/** One shared promise for `use()`: a failed restore still opens an empty editor. */
export const sessionRestored = () => (restored ??= restoreSession().catch(reportError));

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
