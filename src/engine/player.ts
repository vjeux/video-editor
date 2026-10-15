import { audibleClips } from "../core/timeline";
import type { Id, Project } from "../core/types";
import { scheduleAudio, stopAll } from "./audio-graph";
import type { MediaLibrary } from "./media-library";

/** Head-room so the first scheduled samples are not already in the past. */
const START_LATENCY = 0.04;

/**
 * Playback clock driven by the AudioContext, so video follows audio rather
 * than drifting against it. Audio is (re)scheduled from the project whenever
 * playback starts or the project changes mid-play.
 */
export class Player {
  private readonly media: MediaLibrary;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioScheduledSourceNode[] = [];
  private anchor: { ctxTime: number; time: number } | null = null;
  private buffers = new Map<Id, AudioBuffer | null>();
  private project: Project | null = null;
  private volume = 1;

  constructor(media: MediaLibrary) {
    this.media = media;
  }

  get playing(): boolean {
    return this.anchor !== null;
  }

  private context(): { ctx: AudioContext; master: GainNode } {
    if (!this.ctx || !this.master) {
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    return { ctx: this.ctx, master: this.master };
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.master) this.master.gain.value = volume;
  }

  time(): number {
    if (!this.anchor || !this.ctx) return 0;
    return this.anchor.time + Math.max(0, this.ctx.currentTime - this.anchor.ctxTime);
  }

  play(project: Project, from: number) {
    const { ctx } = this.context();
    void ctx.resume();
    this.anchor = { ctxTime: ctx.currentTime + START_LATENCY, time: from };
    this.schedule(project);
  }

  /** Re-plans audio from the current position after an edit during playback. */
  update(project: Project) {
    if (!this.anchor || project === this.project) return;
    this.restart(project);
  }

  pause(): number {
    const time = this.time();
    stopAll(this.nodes);
    this.nodes = [];
    this.anchor = null;
    return time;
  }

  private restart(project: Project) {
    const time = this.time();
    stopAll(this.nodes);
    this.anchor = { ctxTime: this.context().ctx.currentTime + START_LATENCY, time };
    this.schedule(project);
  }

  private schedule(project: Project) {
    const { ctx, master } = this.context();
    const anchor = this.anchor;
    if (!anchor) return;
    this.project = project;
    this.nodes = scheduleAudio(
      ctx,
      master,
      project,
      anchor.time,
      anchor.ctxTime,
      (id) => this.buffers.get(id) ?? null,
    );

    for (const clip of audibleClips(project)) {
      if (this.buffers.has(clip.assetId)) continue;
      this.buffers.set(clip.assetId, null);
      void this.media.audioBuffer(clip.assetId).then((buffer) => {
        this.buffers.set(clip.assetId, buffer);
        if (buffer && this.anchor && this.project) this.restart(this.project);
      });
    }
  }

  forget(assetId: Id) {
    this.buffers.delete(assetId);
  }
}
