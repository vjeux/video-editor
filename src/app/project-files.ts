import { packProject, projectFilename, rekeyBundle, unpackProject } from "../core/project-file";
import { loadMedia } from "../engine/persistence";
import { editorStore, mediaStore } from "../store";
import { noticeStore } from "../store/notices";
import { sessionStore } from "../store/session";
import { importFiles, openAsset } from "./assets";
import { newId } from "./engine";
import { importEffectFiles, isEffectFile } from "./effects";
import { keepSourceMedia } from "./media-storage";
import { pause } from "./playback";
import { pickFiles } from "./source-files";

export const isProjectFile = (file: File) => /\.cutline$/i.test(file.name);

/** Download a portable project, including every original file in its media bin. */
export async function saveProjectFile() {
  if (sessionStore.getState().fileTask) return;
  sessionStore.setState({ fileTask: "saving" });
  try {
    const project = editorStore.getState().project;
    const blob = await packProject(project, loadMedia);
    const url = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: projectFilename(project.name),
    });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    noticeStore
      .getState()
      .push("success", "Project ready to save", "Your Cutline file includes all source media.");
  } finally {
    sessionStore.setState({ fileTask: null });
  }
}

export async function openProjectFile(file: File) {
  const bundle = rekeyBundle(await unpackProject(file), newId);
  // Persist before switching. A failed write leaves the current project
  // untouched; media that does not fit stays usable for this session.
  await keepSourceMedia(bundle.media, "This project's media");
  pause();
  const editor = editorStore.getState();
  editor.select([]);
  editor.commit(() => bundle.project);
  editor.setPlayhead(0);
  for (const asset of Object.values(bundle.project.assets)) {
    mediaStore.getState().patch(asset.id, { status: "loading" });
    void openAsset(asset, bundle.media.get(asset.id)!);
  }
  noticeStore
    .getState()
    .push("success", `Opened “${bundle.project.name}”`, "Undo returns to your previous project.");
}

/** Lets the user pick a project, media or effects, then opens them (Open… and Mod+O). */
export async function chooseAndOpen(fallback: HTMLInputElement | null) {
  const files = await pickFiles(fallback);
  if (files) await openFiles(files);
}

/** Open a project or import media/effects from the same picker. */
export async function openFiles(files: File[]) {
  if (sessionStore.getState().fileTask || files.length === 0) return;
  sessionStore.setState({ fileTask: "opening" });
  try {
    const projects = files.filter(isProjectFile);
    if (projects.length) {
      if (files.length !== 1)
        throw new Error("Choose one Cutline project at a time. Open media separately to add it.");
      await openProjectFile(projects[0]!);
      return;
    }
    await importEffectFiles(files.filter(isEffectFile));
    await importFiles(files.filter((file) => !isEffectFile(file)));
  } finally {
    sessionStore.setState({ fileTask: null });
  }
}
