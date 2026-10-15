import { gainAt } from "../core/animation";
import { audibleClips, clipEnd } from "../core/timeline";
import type { Id, MediaClip, Project } from "../core/types";

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
): AudioBufferSourceNode[] {
  const at = (t: number) => when + (t - from);
  const nodes: AudioBufferSourceNode[] = [];

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
    source.playbackRate.value = clip.speed;
    source.connect(gain);
    source.start(
      at(begin),
      clip.offset + (begin - clip.start) * clip.speed,
      (end - begin) * clip.speed,
    );
    nodes.push(source);
  }
  return nodes;
}

export function stopAll(nodes: AudioBufferSourceNode[]) {
  for (const node of nodes) {
    node.stop();
    node.disconnect();
  }
}
