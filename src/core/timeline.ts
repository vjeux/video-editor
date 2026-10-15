import { TRACK_ACCEPTS } from "./factories";
import { rampSourceTime } from "./speed-ramps";
import type { Clip, ClipKind, Id, IdFactory, MediaClip, Project, Seconds, Track } from "./types";

/** Clip edges closer than this are considered touching (absorbs float error). */
const EPSILON = 1e-6;

export const clipEnd = (clip: Clip): Seconds => clip.start + clip.duration;

export function findTrack(project: Project, trackId: Id): Track {
  const track = project.tracks.find((t) => t.id === trackId);
  if (!track) throw new Error(`Unknown track ${trackId}`);
  return track;
}

export function findClip(project: Project, id: Id): Clip {
  const clip = project.clips[id];
  if (!clip) throw new Error(`Unknown clip ${id}`);
  return clip;
}

export function clipKind(project: Project, clip: Clip): ClipKind {
  if (clip.type !== "media") return clip.type;
  const asset = project.assets[clip.assetId];
  if (!asset) throw new Error(`Clip ${clip.id} references missing asset ${clip.assetId}`);
  return asset.kind;
}

export function canPlace(project: Project, kind: ClipKind, trackId: Id): boolean {
  const track = project.tracks.find((t) => t.id === trackId);
  return !!track && !track.locked && TRACK_ACCEPTS[track.kind].includes(kind);
}

const NO_CLIPS: readonly Clip[] = [];
/** Per-track lists for each (immutable) clip map, built in one pass on first use. */
const byTrack = new WeakMap<Project["clips"], Map<Id, readonly Clip[]>>();
const durations = new WeakMap<Project["clips"], Seconds>();

/** A track's clips in time order; the same clips always give the same list. */
export function clipsOnTrack(project: Project, trackId: Id): readonly Clip[] {
  let tracks = byTrack.get(project.clips);
  if (!tracks) {
    const grouped = new Map<Id, Clip[]>();
    for (const clip of Object.values(project.clips)) {
      const list = grouped.get(clip.trackId);
      if (list) list.push(clip);
      else grouped.set(clip.trackId, [clip]);
    }
    for (const list of grouped.values()) list.sort((a, b) => a.start - b.start);
    tracks = grouped;
    byTrack.set(project.clips, tracks);
  }
  return tracks.get(trackId) ?? NO_CLIPS;
}

/** Source seconds consumed per timeline second. Titles have no source. */
const rate = (clip: Clip) => (clip.type === "media" ? clip.speed : 0);

/** Moves the clip's start edge, keeping its end fixed and its source in sync. */
/**
 * A ramped clip whose edges move is baked to the constant speed that covers
 * the same source, so the cut stays seamless (the curve no longer fits).
 */
function bakeRamp(clip: MediaClip, start: Seconds, end: Seconds): MediaClip {
  const offset = sourceTimeAt(clip, start);
  const duration = end - start;
  const speed = duration > 0 ? (sourceTimeAt(clip, end) - offset) / duration : clip.speed;
  return { ...clip, start, duration, offset, speed, speedRamp: null };
}

function withStart(clip: Clip, start: Seconds): Clip {
  if (clip.type === "media" && clip.speedRamp) return bakeRamp(clip, start, clipEnd(clip));
  const delta = start - clip.start;
  const moved = { ...clip, start, duration: clip.duration - delta };
  if (moved.type === "media") return { ...moved, offset: moved.offset + delta * rate(clip) };
  // Word timings are relative to the start; the words themselves stay put.
  if (moved.type === "text" && moved.words) {
    return {
      ...moved,
      words: moved.words.map((w) => ({ ...w, start: w.start - delta, end: w.end - delta })),
    };
  }
  return moved;
}

const withEnd = (clip: Clip, end: Seconds): Clip =>
  clip.type === "media" && clip.speedRamp
    ? bakeRamp(clip, clip.start, end)
    : { ...clip, duration: end - clip.start };

/** The half before a cut keeps how the clip enters; the half after keeps how it leaves. */
const leftPart = (clip: Clip, at: Seconds): Clip => ({
  ...withEnd(clip, at),
  fadeOut: 0,
  animationOut: null,
});
const rightPart = (clip: Clip, at: Seconds, id: Id): Clip => ({
  ...withStart(clip, at),
  id,
  fadeIn: 0,
  animationIn: null,
  transitionIn: null,
});

function setClips(project: Project, remove: readonly Id[], put: readonly Clip[]): Project {
  const clips = { ...project.clips };
  for (const id of remove) delete clips[id];
  for (const clip of put) clips[clip.id] = clip;
  return { ...project, clips };
}

/** Overwrite edit: the clip takes its slot, carving out whatever was underneath. */
export function placeClip(project: Project, clip: Clip, newId: IdFactory): Project {
  const track = findTrack(project, clip.trackId);
  if (track.locked) throw new Error(`Track ${track.name} is locked`);
  const kind = clipKind(project, clip);
  if (!TRACK_ACCEPTS[track.kind].includes(kind)) {
    throw new Error(`Track ${track.name} does not accept ${kind} clips`);
  }

  const start = clip.start;
  const end = clipEnd(clip);
  const removed: Id[] = [];
  const put: Clip[] = [clip];

  for (const other of clipsOnTrack(project, clip.trackId)) {
    if (other.id === clip.id) continue;
    const otherEnd = clipEnd(other);
    if (otherEnd <= start + EPSILON || other.start >= end - EPSILON) continue;

    const coversHead = other.start >= start - EPSILON;
    const coversTail = otherEnd <= end + EPSILON;
    if (coversHead && coversTail) {
      removed.push(other.id);
    } else if (coversHead) {
      put.push(withStart(other, end));
    } else if (coversTail) {
      put.push(withEnd(other, start));
    } else {
      put.push(leftPart(other, start), rightPart(other, end, newId()));
    }
  }
  return setClips(project, removed, put);
}

export function moveClip(
  project: Project,
  id: Id,
  to: { start: Seconds; trackId: Id },
  newId: IdFactory,
): Project {
  return moveClips(project, [{ id, ...to }], newId);
}

export function maxClipDuration(project: Project, clip: Clip): Seconds {
  if (clip.type !== "media") return Infinity;
  const duration = project.assets[clip.assetId]?.duration;
  if (duration == null) return Infinity;
  return (duration - clip.offset) / clip.speed;
}

function neighbours(project: Project, clip: Clip) {
  const others = clipsOnTrack(project, clip.trackId).filter((c) => c.id !== clip.id);
  const before = others.filter((c) => clipEnd(c) <= clip.start + EPSILON).at(-1);
  const after = others.find((c) => c.start >= clipEnd(clip) - EPSILON);
  return { min: before ? clipEnd(before) : 0, max: after ? after.start : Infinity };
}

/** Rolls one edge towards `time`, bounded by neighbours, source media and a one-frame minimum. */
export function trimClip(project: Project, id: Id, edge: "start" | "end", time: Seconds): Project {
  const clip = findClip(project, id);
  const minDuration = 1 / project.settings.fps;
  const { min, max } = neighbours(project, clip);

  if (edge === "start") {
    const sourceLimit = clip.type === "media" ? clip.start - clip.offset / clip.speed : -Infinity;
    const lower = Math.max(min, sourceLimit);
    const start = Math.min(Math.max(time, lower), clipEnd(clip) - minDuration);
    return setClips(project, [], [withStart(clip, start)]);
  }
  const upper = Math.min(max, clip.start + maxClipDuration(project, clip));
  const end = Math.max(Math.min(time, upper), clip.start + minDuration);
  return setClips(project, [], [withEnd(clip, end)]);
}

export function splitClip(project: Project, id: Id, time: Seconds, newId: IdFactory): Project {
  const clip = findClip(project, id);
  if (time <= clip.start + EPSILON || time >= clipEnd(clip) - EPSILON) return project;
  const left = leftPart(clip, time);
  const right = rightPart(clip, time, newId());
  return setClips(project, [], [left, right]);
}

export function splitAtTime(
  project: Project,
  time: Seconds,
  newId: IdFactory,
  only?: readonly Id[],
): Project {
  const locked = new Set(project.tracks.filter((t) => t.locked).map((t) => t.id));
  return Object.values(project.clips)
    .filter((c) => !locked.has(c.trackId) && (!only || only.includes(c.id)))
    .reduce((acc, c) => splitClip(acc, c.id, time, newId), project);
}

export function removeClips(
  project: Project,
  ids: readonly Id[],
  opts: { ripple?: boolean } = {},
): Project {
  const removed = ids.map((id) => findClip(project, id));
  const remaining = Object.values(project.clips).filter((c) => !ids.includes(c.id));
  const put = opts.ripple
    ? remaining.map((clip) => {
        const shift = removed
          .filter((r) => r.trackId === clip.trackId && clipEnd(r) <= clip.start + EPSILON)
          .reduce((sum, r) => sum + r.duration, 0);
        return shift > 0 ? { ...clip, start: clip.start - shift } : clip;
      })
    : [];
  return setClips(project, ids, put);
}

export function removeAsset(project: Project, assetId: Id): Project {
  const { [assetId]: _removed, ...assets } = project.assets;
  const users = Object.values(project.clips)
    .filter((c) => c.type === "media" && c.assetId === assetId)
    .map((c) => c.id);
  return { ...setClips(project, users, []), assets };
}

export function projectDuration(project: Project): Seconds {
  let duration = durations.get(project.clips);
  if (duration === undefined) {
    duration = Object.values(project.clips).reduce((end, clip) => Math.max(end, clipEnd(clip)), 0);
    durations.set(project.clips, duration);
  }
  return duration;
}

export function trackEnd(project: Project, trackId: Id): Seconds {
  return Math.max(0, ...clipsOnTrack(project, trackId).map(clipEnd));
}

const isActiveAt = (clip: Clip, t: Seconds) => t >= clip.start && t < clipEnd(clip);

/** Visual clips under `t`, ordered bottom (drawn first) to top. */
export function visualLayers(project: Project, t: Seconds): Clip[] {
  return project.tracks
    .filter((track) => track.kind !== "audio" && !track.hidden)
    .toReversed()
    .flatMap((track) => clipsOnTrack(project, track.id).filter((c) => isActiveAt(c, t)));
}

export function audibleClips(project: Project): MediaClip[] {
  const anySolo = project.tracks.some((t) => t.solo);
  return project.tracks
    .filter((track) => (anySolo ? track.solo : !track.muted))
    .flatMap((track) => clipsOnTrack(project, track.id))
    .filter(
      (c): c is MediaClip => c.type === "media" && project.assets[c.assetId]?.hasAudio === true,
    );
}

export function snapTime(t: Seconds, candidates: readonly Seconds[], threshold: Seconds) {
  let best: Seconds | null = null;
  for (const c of candidates) {
    if (Math.abs(c - t) <= threshold && (best === null || Math.abs(c - t) < Math.abs(best - t)))
      best = c;
  }
  return best === null ? { time: t, snapped: false } : { time: best, snapped: true };
}

export function snapCandidates(
  project: Project,
  opts: { exclude: readonly Id[]; playhead: Seconds },
): Seconds[] {
  const edges = Object.values(project.clips)
    .filter((c) => !opts.exclude.includes(c.id))
    .flatMap((c) => [c.start, clipEnd(c)]);
  return [...new Set([0, opts.playhead, ...project.markers.map((m) => m.time), ...edges])];
}

export const sourceTimeAt = (clip: MediaClip, t: Seconds): Seconds =>
  rampSourceTime(clip, t) ?? clip.offset + (t - clip.start) * clip.speed;

/** Retimes a media clip over the same source span, bounded by its neighbours and source. */
export function setClipSpeed(project: Project, id: Id, speed: number): Project {
  const clip = findClip(project, id);
  if (clip.type !== "media" || speed <= 0) return project;
  const desired = (clip.duration * clip.speed) / speed;
  const retimed = { ...clip, speed, duration: 1 / project.settings.fps };
  return trimClip(setClips(project, [], [retimed]), id, "end", clip.start + desired);
}

/** Lifts every moved clip first, then places each, so a group never overwrites itself. */
export function moveClips(
  project: Project,
  moves: readonly { id: Id; start: Seconds; trackId: Id }[],
  newId: IdFactory,
): Project {
  const lifted = moves.map(({ id, start, trackId }) => ({
    ...findClip(project, id),
    start: Math.max(0, start),
    trackId,
  }));
  const base = setClips(
    project,
    moves.map((m) => m.id),
    [],
  );
  return lifted.reduce((acc, clip) => placeClip(acc, clip, newId), base);
}

/** Places copies of `clips` so the earliest starts at `at`, keeping relative timing and tracks. */
export function pasteClips(
  project: Project,
  clips: readonly Clip[],
  at: Seconds,
  newId: IdFactory,
): { project: Project; ids: Id[] } {
  const origin = Math.min(...clips.map((c) => c.start));
  const ids: Id[] = [];
  let next = project;
  for (const clip of clips) {
    if (!canPlace(next, clipKind(next, clip), clip.trackId)) continue;
    const copy = { ...clip, id: newId(), start: at + clip.start - origin };
    next = placeClip(next, copy, newId);
    ids.push(copy.id);
  }
  return { project: next, ids };
}

/** Scale at which a fitted (contained) layer covers the whole frame. */
export function fillScale(project: Project, clip: Clip): number {
  const asset = clip.type === "media" ? project.assets[clip.assetId] : undefined;
  if (!asset?.width || !asset.height) return 1;
  const { width, height } = project.settings;
  const contain = Math.min(width / asset.width, height / asset.height);
  const cover = Math.max(width / asset.width, height / asset.height);
  return cover / contain;
}

/** Last decodable instant of a source: a hair before its end. */
const SOURCE_END_MARGIN = 1 / 120;

/**
 * Source time to show for a clip at `t`, which may lie outside the clip
 * (transitions extend both sides of a cut), clamped to the media.
 */
export function frameSourceTime(project: Project, clip: MediaClip, t: Seconds): Seconds {
  const duration = project.assets[clip.assetId]?.duration;
  const end = duration == null ? Infinity : Math.max(0, duration - SOURCE_END_MARGIN);
  return Math.min(end, Math.max(0, sourceTimeAt(clip, t)));
}

/** Ripple insert: shifts every clip on `trackId` starting at or after `at` by `duration`. */
export function insertGap(project: Project, trackId: Id, at: Seconds, duration: Seconds): Project {
  const moved = clipsOnTrack(project, trackId)
    .filter((c) => c.start >= at - EPSILON)
    .map((c) => ({ ...c, start: c.start + duration }));
  return setClips(project, [], moved);
}

/** Strips binary floating point noise such as 3.5000000000000004. */
const clean = (t: number) => Number(t.toPrecision(12));
const BISECTION_STEPS = 40;

/**
 * The timeline time at which `clip` plays source time `sourceTime`: the
 * inverse of its speed (and ramp) mapping; null outside its source range.
 */
export function timelineTimeOf(clip: MediaClip, sourceTime: Seconds): Seconds | null {
  const end = clip.start + clip.duration;
  const from = sourceTimeAt(clip, clip.start);
  const to = sourceTimeAt(clip, end);
  const eps = 1e-9;
  if (sourceTime < from - eps || sourceTime > to + eps) return null;
  if (!clip.speedRamp) return clean(clip.start + (sourceTime - clip.offset) / clip.speed);
  // Ramps are monotonic, so bisection finds the moment that source plays.
  let lo = clip.start;
  let hi = end;
  for (let i = 0; i < BISECTION_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (sourceTimeAt(clip, mid) < sourceTime) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
