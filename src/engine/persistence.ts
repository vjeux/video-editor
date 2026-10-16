import { createStore, del, get, keys, set } from "idb-keyval";
import { keepPlan } from "../core/storage";
import type { Id, Project } from "../core/types";

const projects = createStore("cutline-projects", "projects");
const media = createStore("cutline-media", "files");
const CURRENT = "current";

export const saveProject = (project: Project) => set(CURRENT, project, projects);
/** Raw saved data; run it through `migrateProject` before use. */
export const loadProject = () => get<unknown>(CURRENT, projects);

/** A file the user picked or dropped in Chromium, reopenable after a reload. */
interface LinkedFile {
  handle: FileSystemFileHandle;
}
/** What IndexedDB holds per asset: a copy of the file, or a link to it. */
type StoredMedia = Blob | LinkedFile;

/** File System Access permission calls, not yet in TypeScript's DOM types. */
interface PermissionedHandle {
  queryPermission(options: { mode: "read" }): Promise<PermissionState>;
  requestPermission(options: { mode: "read" }): Promise<PermissionState>;
}

export interface SourceFile {
  file: Blob;
  /** Where the file lives on disk, when the browser gave us a handle to it. */
  handle?: FileSystemFileHandle | null;
}

/**
 * Every source file this session, however it is kept. The Blobs are the
 * user's own files (or slices of an opened project), backed by disk, so
 * holding them costs no memory.
 */
const sessionFiles = new Map<Id, Blob>();

let persistence: Promise<boolean> | null = null;
/** Asks once that stored media not be evicted under storage pressure. */
const persist = () => (persistence ??= navigator.storage?.persist?.() ?? Promise.resolve(false));

export interface KeptMedia {
  /** Every file survives a reload, linked or copied. */
  stored: boolean;
  /** Bytes that had to be copied into IndexedDB. */
  bytes: number;
  /** Space the browser reported free before copying, when it reports one. */
  free: number | null;
}

/**
 * Keeps source files for this session and for later ones. Files with a
 * handle are linked (instant, no quota); the rest are copied into
 * IndexedDB when they all fit. A failed copy is rolled back, and the files
 * stay usable (and savable as a project) until the tab closes.
 */
export async function keepMedia(sources: ReadonlyMap<Id, SourceFile>): Promise<KeptMedia> {
  for (const [id, { file }] of sources) sessionFiles.set(id, file);
  const entries = [...sources];
  const copies = entries.some(([, s]) => !s.handle);
  if (copies) await persist().catch(() => false);
  const estimate = copies ? ((await navigator.storage?.estimate?.().catch(() => null)) ?? {}) : {};
  const plan = keepPlan(
    entries.map(([, s]) => ({ bytes: s.file.size, linkable: !!s.handle })),
    estimate,
  );
  const kept = { bytes: plan.copyBytes, free: plan.free };
  const written: Id[] = [];
  try {
    for (const [i, [id, source]] of entries.entries()) {
      const how = plan.keep[i];
      if (how === "session") continue;
      const value: StoredMedia = how === "link" ? { handle: source.handle! } : source.file;
      await set(id, value, media);
      written.push(id);
    }
    return { ...kept, stored: !plan.keep.includes("session") };
  } catch (error) {
    await Promise.allSettled(written.map((id) => del(id, media)));
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      return { ...kept, stored: false };
    }
    throw error;
  }
}

/** A stored source after a reload. */
export type RestoredMedia =
  | { kind: "file"; file: Blob }
  /** Linked, but the browser wants the user's permission again (one click). */
  | { kind: "reconnect" }
  | { kind: "missing" };

async function readLinked(linked: LinkedFile, ask: boolean): Promise<RestoredMedia> {
  const handle = linked.handle as FileSystemFileHandle & PermissionedHandle;
  const options = { mode: "read" } as const;
  let permission = await handle.queryPermission(options);
  if (permission === "prompt" && ask) permission = await handle.requestPermission(options);
  if (permission !== "granted") return { kind: "reconnect" };
  try {
    return { kind: "file", file: await handle.getFile() };
  } catch {
    // Moved, renamed or deleted since it was imported.
    return { kind: "missing" };
  }
}

/**
 * Reopens an asset's stored source. With `ask`, which must run from a
 * click, a linked file the browser has locked again prompts for access.
 */
export async function restoreMedia(id: Id, { ask = false } = {}): Promise<RestoredMedia> {
  const session = sessionFiles.get(id);
  if (session) return { kind: "file", file: session };
  const stored = await get<StoredMedia>(id, media);
  const restored: RestoredMedia = !stored
    ? { kind: "missing" }
    : stored instanceof Blob
      ? { kind: "file", file: stored }
      : await readLinked(stored, ask);
  if (restored.kind === "file") sessionFiles.set(id, restored.file);
  return restored;
}

/** The asset's source file, when it can be read without asking the user. */
export const loadMedia = async (id: Id): Promise<Blob | undefined> => {
  const restored = await restoreMedia(id);
  return restored.kind === "file" ? restored.file : undefined;
};

export const deleteMedia = (id: Id) => {
  sessionFiles.delete(id);
  return del(id, media);
};
export const storedMediaIds = () => keys<Id>(media);
