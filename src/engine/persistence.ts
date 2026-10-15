import { createStore, del, get, keys, set } from "idb-keyval";
import type { Id, Project } from "../core/types";

const projects = createStore("cutline-projects", "projects");
const media = createStore("cutline-media", "files");
const CURRENT = "current";

export const saveProject = (project: Project) => set(CURRENT, project, projects);
/** Raw saved data; run it through `migrateProject` before use. */
export const loadProject = () => get<unknown>(CURRENT, projects);

export const saveMedia = (id: Id, file: Blob) => set(id, file, media);
export const loadMedia = (id: Id) => get<Blob>(id, media);
export const deleteMedia = (id: Id) => del(id, media);
export const storedMediaIds = () => keys<Id>(media);
