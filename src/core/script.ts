import type { IdFactory, Project } from "./types";

export interface ScriptResult {
  project: Project;
  logs: string[];
  error: string | null;
}

export async function runScript(
  _project: Project,
  _code: string,
  _newId: IdFactory,
): Promise<ScriptResult> {
  throw new Error("not implemented");
}
