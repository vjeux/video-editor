import { migrateProject } from "../core/migrate";
import type { Asset, Project } from "../core/types";
import {
  deleteMedia,
  loadProject,
  restoreMedia,
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
  for (const asset of Object.values(saved.assets)) void reopen(asset, false);
}

/** Opens an asset's stored source, or marks it offline or missing. */
async function reopen(asset: Asset, ask: boolean) {
  mediaStore.getState().patch(asset.id, { status: "loading" });
  const { patch } = mediaStore.getState();
  try {
    const restored = await restoreMedia(asset.id, { ask });
    if (restored.kind === "file") await openAsset(asset, restored.file);
    else patch(asset.id, { status: restored.kind === "reconnect" ? "offline" : "missing" });
  } catch (error) {
    patch(asset.id, { status: "error", error: (error as Error).message });
    reportError(error);
  }
}

/**
 * Asks the browser again for the linked files it locked after a reload
 * (one prompt per file, from the click that runs this) and loads them.
 */
export async function reconnectMedia(ids?: readonly string[]) {
  const { project } = editorStore.getState();
  const { assets } = mediaStore.getState();
  const offline = Object.values(project.assets).filter(
    (asset) => assets[asset.id]?.status === "offline" && (!ids || ids.includes(asset.id)),
  );
  // Sequential: each permission prompt waits for the user's answer.
  for (const asset of offline) await reopen(asset, true);
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
