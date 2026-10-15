import { formatBytes } from "../core/storage";
import type { Id } from "../core/types";
import { keepMedia } from "../engine/persistence";
import { noticeStore } from "../store/notices";

/**
 * Keeps source files for the session and in browser storage when they fit,
 * telling the user plainly when they will not survive a reload. `what`
 * names them in the notice ("“interview.mp4”", "This project's media").
 */
export async function keepSourceMedia(files: ReadonlyMap<Id, Blob>, what: string) {
  const kept = await keepMedia(files);
  if (kept.stored) return;
  const free = kept.free === null ? "" : ` and ${formatBytes(Math.max(0, kept.free))} is free`;
  noticeStore
    .getState()
    .push(
      "info",
      `${what} won't be kept after a reload`,
      `Browser storage is full: it needs ${formatBytes(kept.bytes)}${free}. It works until you close this tab; save the project as a Cutline file to keep it.`,
    );
}
