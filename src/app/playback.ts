import { frameStart } from "../core/time";
import { projectDuration } from "../core/timeline";
import { perf } from "../engine/perf";
import { PreviewRenderer } from "../engine/preview";
import { editorStore, mediaStore } from "../store";
import { media, player } from "./engine";
import { reportError } from "./errors";

const state = () => editorStore.getState();

export function play() {
  const { project, playhead, setPlaying } = state();
  const end = projectDuration(project);
  if (end <= 0) return;
  player.play(project, playhead >= end - 1e-3 ? 0 : playhead);
  setPlaying(true);
}

export function pause() {
  if (!player.playing) return;
  const t = player.pause();
  state().setPlayhead(t);
  state().setPlaying(false);
}

export const togglePlay = () => (player.playing ? pause() : play());

export function seek(t: number) {
  const { project, setPlayhead } = state();
  const time = Math.min(Math.max(0, t), projectDuration(project));
  if (player.playing) {
    player.pause();
    player.play(project, time);
  }
  setPlayhead(time);
}

editorStore.subscribe((s, prev) => {
  if (s.monitorVolume !== prev.monitorVolume) player.setVolume(s.monitorVolume);
});

/** Drives playback and preview rendering for one viewer canvas; returns a detach function. */
export function attachViewer(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not create the preview canvas");
  let dirty = true;
  const preview = new PreviewRenderer(media, () => (dirty = true), reportError);
  const markDirty = () => (dirty = true);
  // Restored files may finish decoding after the project has already rendered.
  const unsubscribeMedia = mediaStore.subscribe(markDirty);
  document.fonts.addEventListener("loadingdone", markDirty);

  let last = { project: state().project, t: -1, width: 0, height: 0, editing: state().editingText };
  let frame = 0;
  const tick = () => {
    frame = requestAnimationFrame(tick);
    const s = state();
    let t = s.playhead;

    if (player.playing) {
      player.update(s.project);
      // Show the frame on screen at the audio clock: a 30 fps project composites
      // 30 times a second whatever the display refresh, and matches export timing.
      t = frameStart(player.time(), s.project.settings.fps);
      const end = projectDuration(s.project);
      if (t >= end) {
        player.pause();
        if (s.loop && end > 0) {
          t = 0;
          player.play(s.project, 0);
        } else {
          t = end;
          s.setPlaying(false);
        }
      }
      if (t !== s.playhead) s.setPlayhead(t);
    }

    const changed =
      dirty ||
      s.project !== last.project ||
      t !== last.t ||
      s.editingText !== last.editing ||
      canvas.width !== last.width ||
      canvas.height !== last.height;
    if (!changed) return;
    dirty = false;
    last = {
      project: s.project,
      t,
      width: canvas.width,
      height: canvas.height,
      editing: s.editingText,
    };
    const from = performance.now();
    preview.render(ctx, s.project, t, player.playing, s.editingText);
    perf.composite(performance.now() - from);
  };
  tick();

  return () => {
    cancelAnimationFrame(frame);
    unsubscribeMedia();
    document.fonts.removeEventListener("loadingdone", markDirty);
    preview.dispose();
  };
}
