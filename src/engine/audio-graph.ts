import { gainAt } from "../core/animation";
import { clipSpan } from "../core/audio-windows";
import { rampSpeedAt } from "../core/speed-ramps";
import { audibleClips, clipEnd, sourceTimeAt } from "../core/timeline";
import type { MediaClip, Project, Seconds } from "../core/types";
import { buildAudioChain } from "./audio-effects";
import type { AudioSlice } from "./audio-reader";

/** Samples per speed-ramp playback-rate curve. */
const RAMP_SAMPLES = 64;
/** Modulators keep running briefly after a clip so reverb/echo tails aren't chopped. */
const TAIL = 3;

/** Timeline time `from` plays at context time `when`. */
export interface AudioOrigin {
  from: Seconds;
  when: number;
}

/**
 * One clip's volume, fades and effect stack, built once per scheduling
 * pass. Its sound is fed in afterwards, slice by slice, with `playSlice`.
 */
export interface ClipVoice {
  clip: MediaClip;
  input: AudioNode;
  output: AudioNode;
  /** Modulators to stop with the clip. */
  nodes: AudioScheduledSourceNode[];
}

const contextTime = (origin: AudioOrigin, t: Seconds) => origin.when + (t - origin.from);

/** Timeline instants where a clip's gain changes slope; linear ramps between them are exact. */
function gainBreakpoints(clip: MediaClip, from: number): number[] {
  const end = clipEnd(clip);
  const points = [from, clip.start + clip.fadeIn, end - clip.fadeOut, end];
  return [...new Set(points.filter((p) => p >= from && p <= end))].sort((a, b) => a - b);
}

/** The clip's voice from `origin.from` on, or null when it is silent from there. */
export function clipVoice(
  ctx: BaseAudioContext,
  destination: AudioNode,
  clip: MediaClip,
  origin: AudioOrigin,
): ClipVoice | null {
  const end = clipEnd(clip);
  if (end <= origin.from || clip.volume <= 0) return null;
  const at = (t: Seconds) => contextTime(origin, t);
  const begin = Math.max(origin.from, clip.start);

  const gain = ctx.createGain();
  const [first, ...rest] = gainBreakpoints(clip, begin);
  gain.gain.setValueAtTime(gainAt(clip, first ?? begin), at(begin));
  for (const t of rest)
    gain.gain.linearRampToValueAtTime(gainAt(clip, Math.min(t, end - 1e-6)), at(t));
  gain.connect(destination);

  // slices → audio effect stack → volume/fades → destination
  const chain = buildAudioChain(ctx, clip.audioEffects, {
    start: at(begin),
    stop: at(end),
    elapsed: begin - clip.start,
  });
  if (!chain) return { clip, input: gain, output: gain, nodes: [] };
  chain.output.connect(gain);
  for (const node of chain.scheduled) node.stop(at(end) + TAIL);
  return { clip, input: chain.input, output: gain, nodes: chain.scheduled };
}

/**
 * Plays timeline span `from…to` of the voice's clip out of `slice`, which
 * must hold the source that span reads. Consecutive spans join seamlessly.
 */
export function playSlice(
  ctx: BaseAudioContext,
  voice: ClipVoice,
  slice: AudioSlice,
  span: { from: Seconds; to: Seconds },
  origin: AudioOrigin,
): AudioBufferSourceNode {
  const { clip } = voice;
  const source = ctx.createBufferSource();
  source.buffer = slice.buffer;
  const start = contextTime(origin, span.from);
  if (clip.speedRamp) {
    const curve = Float32Array.from({ length: RAMP_SAMPLES }, (_, i) =>
      rampSpeedAt(clip, span.from + ((span.to - span.from) * i) / (RAMP_SAMPLES - 1)),
    );
    source.playbackRate.setValueCurveAtTime(curve, start, span.to - span.from);
  } else {
    source.playbackRate.value = clip.speed;
  }
  source.connect(voice.input);
  const sourceFrom = sourceTimeAt(clip, span.from);
  source.start(
    start,
    Math.max(0, sourceFrom - slice.start),
    sourceTimeAt(clip, span.to) - sourceFrom,
  );
  return source;
}

/**
 * Schedules every audible clip's timeline span `origin.from…until` from
 * pre-read slices. Export renders each mix window with it; live playback
 * builds the same voices and feeds them as it goes, so what you hear is
 * what you export.
 */
export function scheduleAudio(
  ctx: BaseAudioContext,
  destination: AudioNode,
  project: Project,
  origin: AudioOrigin,
  until: Seconds,
  slices: (clip: MediaClip) => AudioSlice | null,
): AudioScheduledSourceNode[] {
  return audibleClips(project).flatMap((clip) => {
    const span = clipSpan(clip, origin.from, until);
    const slice = span && slices(clip);
    const voice = slice && clipVoice(ctx, destination, clip, origin);
    if (!span || !slice || !voice) return [];
    return [...voice.nodes, playSlice(ctx, voice, slice, span, origin)];
  });
}

export function stopAll(nodes: Iterable<AudioScheduledSourceNode>) {
  for (const node of nodes) {
    node.stop();
    node.disconnect();
  }
}

/** Silences voices from a plan that is being replaced. */
export function releaseVoices(voices: readonly ClipVoice[]) {
  for (const voice of voices) {
    stopAll(voice.nodes);
    voice.output.disconnect();
  }
}
