import { createStore, del, get, keys, set } from "idb-keyval";
import { storageFit } from "../core/storage";
import type { Id, Project } from "../core/types";

const projects = createStore("cutline-projects", "projects");
const media = createStore("cutline-media", "files");
const CURRENT = "current";

export const saveProject = (project: Project) => set(CURRENT, project, projects);
/** Raw saved data; run it through `migrateProject` before use. */
export const loadProject = () => get<unknown>(CURRENT, projects);

/**
 * Every source file this session, whether or not its copy fits in
 * IndexedDB. The Blobs are the user's own files (or slices of an opened
 * project), backed by disk, so holding them costs no memory.
 */
const sessionFiles = new Map<Id, Blob>();

let persistence: Promise<boolean> | null = null;
/** Asks once that stored media not be evicted under storage pressure. */
const persist = () => (persistence ??= navigator.storage?.persist?.() ?? Promise.resolve(false));

export interface KeptMedia {
  /** Copied into IndexedDB, so the media survives a reload. */
  stored: boolean;
  bytes: number;
  /** Space the browser reported free before copying, when it reports one. */
  free: number | null;
}

/**
 * Keeps source files for this session and copies them into IndexedDB when
 * they fit. All files are copied or none: a failed copy is rolled back, and
 * the files stay usable (and savable as a project) until the tab closes.
 */
export async function keepMedia(files: ReadonlyMap<Id, Blob>): Promise<KeptMedia> {
  for (const [id, file] of files) sessionFiles.set(id, file);
  const bytes = [...files.values()].reduce((sum, f) => sum + f.size, 0);
  await persist().catch(() => false);
  const estimate = (await navigator.storage?.estimate?.().catch(() => null)) ?? {};
  const { fits, free } = storageFit(estimate, bytes);
  if (!fits) return { stored: false, bytes, free };
  const written: Id[] = [];
  try {
    for (const [id, file] of files) {
      await set(id, file, media);
      written.push(id);
    }
    return { stored: true, bytes, free };
  } catch (error) {
    await Promise.allSettled(written.map((id) => del(id, media)));
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      return { stored: false, bytes, free };
    }
    throw error;
  }
}

export const loadMedia = async (id: Id): Promise<Blob | undefined> =>
  sessionFiles.get(id) ?? get<Blob>(id, media);
export const deleteMedia = (id: Id) => {
  sessionFiles.delete(id);
  return del(id, media);
};
export const storedMediaIds = () => keys<Id>(media);
