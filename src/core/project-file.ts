import type { Id, IdFactory, Project } from "./types";
import { readProject } from "./project-validation";

const MAGIC = "CUTLINE\n";
const HEADER_SIZE = 12;
const MAX_MANIFEST = 32 * 1024 * 1024;
export const PROJECT_EXTENSION = ".cutline";
export const PROJECT_MIME = "application/x-cutline";
interface MediaEntry {
  id: Id;
  type: string;
  size: number;
}
interface Manifest {
  format: "cutline-project";
  version: 1;
  project: Project;
  media: MediaEntry[];
}
export interface ProjectBundle {
  project: Project;
  media: Map<Id, Blob>;
}

/** Binary media stays in Blobs: no base64 expansion or whole-video array buffers. */
export async function packProject(
  project: Project,
  load: (id: Id) => Promise<Blob | undefined>,
): Promise<Blob> {
  const blobs: Blob[] = [];
  const entries: MediaEntry[] = [];
  for (const asset of Object.values(project.assets)) {
    const file = await load(asset.id);
    if (!file) throw new Error(`Cannot save: the source file for “${asset.name}” is missing`);
    blobs.push(file);
    entries.push({ id: asset.id, type: file.type, size: file.size });
  }
  const manifest: Manifest = { format: "cutline-project", version: 1, project, media: entries };
  const json = new TextEncoder().encode(JSON.stringify(manifest));
  if (json.byteLength > MAX_MANIFEST)
    throw new Error("This project's metadata is too large to save");
  const header = new Uint8Array(HEADER_SIZE);
  header.set(new TextEncoder().encode(MAGIC));
  new DataView(header.buffer).setUint32(8, json.byteLength, true);
  return new Blob([header, json, ...blobs], { type: PROJECT_MIME });
}

/** Read and validate the complete bundle before making any changes to the editor. */
export async function unpackProject(file: Blob): Promise<ProjectBundle> {
  const header = await file.slice(0, HEADER_SIZE).arrayBuffer();
  if (header.byteLength !== HEADER_SIZE || new TextDecoder().decode(header.slice(0, 8)) !== MAGIC)
    throw new Error("This file is not a Cutline project");
  const length = new DataView(header).getUint32(8, true);
  if (length === 0 || length > MAX_MANIFEST || HEADER_SIZE + length > file.size)
    throw new Error("The Cutline project is incomplete or damaged");
  const raw: unknown = JSON.parse(await file.slice(HEADER_SIZE, HEADER_SIZE + length).text());
  if (!raw || typeof raw !== "object" || !("format" in raw) || raw.format !== "cutline-project")
    throw new Error("This file is not a Cutline project");
  if (!("version" in raw) || raw.version !== 1)
    throw new Error("This Cutline file uses a newer or unsupported format");
  if (!("project" in raw) || !("media" in raw) || !Array.isArray(raw.media))
    throw new Error("The Cutline project manifest is invalid");
  const project = readProject(raw.project);
  const media = new Map<Id, Blob>();
  let offset = HEADER_SIZE + length;
  for (const entry of raw.media as Partial<MediaEntry>[]) {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      typeof entry.type !== "string" ||
      typeof entry.size !== "number" ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      !Object.hasOwn(project.assets, entry.id) ||
      media.has(entry.id) ||
      offset + entry.size > file.size
    )
      throw new Error("The Cutline project's media is incomplete or damaged");
    media.set(entry.id, file.slice(offset, offset + entry.size, entry.type));
    offset += entry.size;
  }
  if (offset !== file.size || media.size !== Object.keys(project.assets).length)
    throw new Error("The Cutline project's media is incomplete or damaged");
  return { project, media };
}

/** Fresh media IDs keep opening a file from overwriting sources used by Undo. */
export function rekeyBundle(bundle: ProjectBundle, newId: IdFactory): ProjectBundle {
  const ids = new Map(Object.keys(bundle.project.assets).map((id) => [id, newId()]));
  return {
    project: {
      ...bundle.project,
      assets: Object.fromEntries(
        Object.values(bundle.project.assets).map((asset) => {
          const id = ids.get(asset.id)!;
          return [id, { ...asset, id }];
        }),
      ),
      clips: Object.fromEntries(
        Object.entries(bundle.project.clips).map(([id, clip]) => [
          id,
          clip.type === "media" ? { ...clip, assetId: ids.get(clip.assetId)! } : clip,
        ]),
      ),
    },
    media: new Map([...bundle.media].map(([id, file]) => [ids.get(id)!, file])),
  };
}

export function projectFilename(name: string): string {
  return `${
    name
      // eslint-disable-next-line no-control-regex -- Strip characters forbidden in filenames.
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      .trim()
      .replace(/\.cutline$/i, "") || "Untitled project"
  }${PROJECT_EXTENSION}`;
}
