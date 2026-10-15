import { gainAt } from "../core/animation";
import { rampSpeedAt } from "../core/speed-ramps";
import { audibleClips, clipEnd, sourceTimeAt } from "../core/timeline";
import type { Id, MediaClip, Project } from "../core/types";
import { buildAudioChain } from "./audio-effects";

/** Samples per speed-ramp playback-rate curve. */
const RAMP_SAMPLES = 64;

export type AudioBuffers = (assetId: Id) => AudioBuffer | null;

/** Timeline instants where a clip's gain changes slope; linear ramps between them are exact. */
function gainBreakpoints(clip: MediaClip, from: number): number[] {
  const end = clipEnd(clip);
  const points = [from, clip.start + clip.fadeIn, end - clip.fadeOut, end];
  return [...new Set(points.filter((p) => p >= from && p <= end))].sort((a, b) => a - b);
}

/**
 * Schedules every audible clip from timeline time `from`, which plays at
 * context time `when`. Used verbatim for live playback and offline export
 * so what you hear is what you export.
 */
export function scheduleAudio(
  ctx: BaseAudioContext,
  destination: AudioNode,
  project: Project,
  from: number,
  when: number,
  buffers: AudioBuffers,
): AudioScheduledSourceNode[] {
  const at = (t: number) => when + (t - from);
  const nodes: AudioScheduledSourceNode[] = [];

  for (const clip of audibleClips(project)) {
    const buffer = buffers(clip.assetId);
    const end = clipEnd(clip);
    if (!buffer || end <= from || clip.volume <= 0) continue;

    const begin = Math.max(from, clip.start);
    const gain = ctx.createGain();
    const [first, ...rest] = gainBreakpoints(clip, begin);
    gain.gain.setValueAtTime(gainAt(clip, first ?? begin), at(begin));
    for (const t of rest)
      gain.gain.linearRampToValueAtTime(gainAt(clip, Math.min(t, end - 1e-6)), at(t));
    gain.connect(destination);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    if (clip.speedRamp) {
      const curve = Float32Array.from({ length: RAMP_SAMPLES }, (_, i) =>
        rampSpeedAt(clip, begin + ((end - begin) * i) / (RAMP_SAMPLES - 1)),
      );
      source.playbackRate.setValueCurveAtTime(curve, at(begin), end - begin);
    } else {
      source.playbackRate.value = clip.speed;
    }

    // source → audio effect stack → volume/fades → destination
    const chain = buildAudioChain(ctx, clip.audioEffects, { start: at(begin), stop: at(end) });
    if (chain) {
      source.connect(chain.input);
      chain.output.connect(gain);
      for (const node of chain.scheduled) {
        node.stop(at(end) + TAIL);
        nodes.push(node);
      }
    } else {
      source.connect(gain);
    }
    const offset = sourceTimeAt(clip, begin);
    source.start(at(begin), offset, sourceTimeAt(clip, end) - offset);
    nodes.push(source);
  }
  return nodes;
}

/** Modulators keep running briefly after a clip so reverb/echo tails aren't chopped. */
const TAIL = 3;

export function stopAll(nodes: AudioScheduledSourceNode[]) {
  for (const node of nodes) {
    node.stop();
    node.disconnect();
  }
}
