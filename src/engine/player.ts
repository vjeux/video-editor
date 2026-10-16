import { clipSpan } from "../core/audio-windows";
import { audibleClips, clipEnd } from "../core/timeline";
import type { Id, MediaClip, Project, Seconds } from "../core/types";
import { audibleContextTime } from "./audio-clock";
import {
  clipVoice,
  playSlice,
  releaseVoices,
  stopAll,
  type AudioOrigin,
  type ClipVoice,
} from "./audio-graph";
import type { AudioReader, AudioSlice } from "./audio-reader";
import type { MediaLibrary } from "./media-library";

/** Head-room so the first scheduled samples are not already in the past. */
const START_LATENCY = 0.04;
/** Sound decoded and scheduled ahead of the playhead. */
const LOOKAHEAD: Seconds = 3;
/** Timeline seconds per scheduled buffer. */
const CHUNK: Seconds = 1;
const FEED_INTERVAL_MS = 250;

interface ClipSource {
  assetId: Id;
  reader: AudioReader;
}

/**
 * Playback clock driven by the AudioContext, so video follows audio rather
 * than drifting against it. Sound streams in: each clip's source is decoded
 * a few seconds ahead of the playhead and scheduled chunk by chunk, so
 * memory does not grow with the length of the media. Audio is replanned
 * from the project whenever playback starts or the project changes mid-play.
 */
export class Player {
  private readonly media: MediaLibrary;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes = new Set<AudioScheduledSourceNode>();
  private anchor: { ctxTime: number; time: number } | null = null;
  /** The last time reported, so the clock is monotonic within one anchor. */
  private lastTime = 0;
  private project: Project | null = null;
  private voices: ClipVoice[] = [];
  /** Readers by clip id, kept across replans so an edit does not restart decoding. */
  private sources = new Map<Id, ClipSource>();
  /** Timeline time scheduled up to. */
  private scheduled: Seconds = 0;
  /** Bumped on every replan; a feed loop from an older plan stops. */
  private plan = 0;
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

  /**
   * Where playback is in what you hear: follows the audio output (so video
   * stays in sync over Bluetooth latency) and never steps backwards.
   */
  time(): number {
    const { anchor, ctx } = this;
    if (!anchor || !ctx) return 0;
    const output = ctx.getOutputTimestamp?.();
    const audible = audibleContextTime({
      output:
        output?.contextTime !== undefined && output.performanceTime !== undefined
          ? { contextTime: output.contextTime, performanceTime: output.performanceTime }
          : null,
      currentTime: ctx.currentTime,
      latency: ctx.outputLatency ?? ctx.baseLatency ?? 0,
      nowMs: performance.now(),
    });
    this.lastTime = Math.max(this.lastTime, anchor.time + Math.max(0, audible - anchor.ctxTime));
    return this.lastTime;
  }

  play(project: Project, from: number) {
    const { ctx } = this.context();
    void ctx.resume();
    this.anchor = { ctxTime: ctx.currentTime + START_LATENCY, time: from };
    this.lastTime = from;
    this.schedule(project);
  }

  /** Re-plans audio from the current position after an edit during playback. */
  update(project: Project) {
    if (!this.anchor || project === this.project) return;
    this.restart(project);
  }

  pause(): number {
    const time = this.time();
    this.silence();
    this.anchor = null;
    for (const source of this.sources.values()) void source.reader.dispose();
    this.sources.clear();
    return time;
  }

  private silence() {
    this.plan++;
    stopAll(this.nodes);
    releaseVoices(this.voices);
    this.nodes.clear();
    this.voices = [];
  }

  private restart(project: Project) {
    const time = this.time();
    this.silence();
    this.anchor = { ctxTime: this.context().ctx.currentTime + START_LATENCY, time };
    this.lastTime = time;
    this.schedule(project);
  }

  private schedule(project: Project) {
    if (!this.anchor) return;
    this.project = project;
    const clips = audibleClips(project).filter((c) => clipEnd(c) > this.anchor!.time);
    const live = new Set(clips.map((c) => c.id));
    for (const [id, source] of this.sources) {
      if (live.has(id)) continue;
      void source.reader.dispose();
      this.sources.delete(id);
    }
    this.scheduled = this.anchor.time;
    if (clips.length > 0) void this.feed(++this.plan, clips);
  }

  /** Keeps `LOOKAHEAD` seconds of sound scheduled until the plan changes. */
  private async feed(plan: number, clips: MediaClip[]) {
    const end = clips.reduce((max, c) => Math.max(max, clipEnd(c)), 0);
    const current = () => plan === this.plan && this.anchor !== null;
    let started = false;
    while (current()) {
      while (current() && this.scheduled < end && this.scheduled < this.time() + LOOKAHEAD) {
        const from = this.scheduled;
        const to = Math.min(end, from + CHUNK);
        const slices = await Promise.all(
          clips.map(async (clip) => {
            const span = clipSpan(clip, from, to);
            const slice = span && (await this.reader(clip)?.read(span.sourceFrom, span.sourceTo));
            return span && slice ? { clip, span, slice } : null;
          }),
        );
        if (!current()) return;
        // The first sound decodes before the clock starts, so playback never
        // opens on a gap; later chunks are seconds ahead and only arrive late
        // if decoding stalls, when the part already due is skipped.
        if (!started) this.startVoices(clips);
        started = true;
        this.queue(slices.flatMap((s) => s ?? []));
        this.scheduled = to;
      }
      await new Promise((resolve) => setTimeout(resolve, FEED_INTERVAL_MS));
    }
  }

  /** Builds each clip's voice, first moving the clock's start to now if decoding took longer. */
  private startVoices(clips: MediaClip[]) {
    const { ctx, master } = this.context();
    const anchor = this.anchor!;
    const late = ctx.currentTime + START_LATENCY / 2 > anchor.ctxTime;
    if (late && this.lastTime <= anchor.time) {
      this.anchor = { ...anchor, ctxTime: ctx.currentTime + START_LATENCY };
    }
    const origin = this.origin();
    this.voices = clips.flatMap((clip) => clipVoice(ctx, master, clip, origin) ?? []);
  }

  private origin(): AudioOrigin {
    const anchor = this.anchor!;
    return { from: anchor.time, when: anchor.ctxTime };
  }

  private queue(
    slices: { clip: MediaClip; span: { from: Seconds; to: Seconds }; slice: AudioSlice }[],
  ) {
    const { ctx } = this.context();
    const origin = this.origin();
    const due = origin.from + (ctx.currentTime + START_LATENCY / 2 - origin.when);
    for (const { clip, span, slice } of slices) {
      const voice = this.voices.find((v) => v.clip.id === clip.id);
      const from = Math.max(span.from, due);
      if (!voice || from >= span.to) continue;
      const node = playSlice(ctx, voice, slice, { from, to: span.to }, origin);
      node.onended = () => this.nodes.delete(node);
      this.nodes.add(node);
    }
  }

  private reader(clip: MediaClip): AudioReader | null {
    let source = this.sources.get(clip.id);
    if (!source) {
      const reader = this.media.audioReader(clip.assetId);
      if (!reader) return null;
      source = { assetId: clip.assetId, reader };
      this.sources.set(clip.id, source);
    }
    return source.reader;
  }

  forget(assetId: Id) {
    for (const [id, source] of this.sources) {
      if (source.assetId !== assetId) continue;
      void source.reader.dispose();
      this.sources.delete(id);
    }
  }
}
