import { TRACK_ACCEPTS } from "./factories";
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

export function clipsOnTrack(project: Project, trackId: Id): Clip[] {
  return Object.values(project.clips)
    .filter((c) => c.trackId === trackId)
    .sort((a, b) => a.start - b.start);
}

/** Source seconds consumed per timeline second. Titles have no source. */
const rate = (clip: Clip) => (clip.type === "media" ? clip.speed : 0);

/** Moves the clip's start edge, keeping its end fixed and its source in sync. */
function withStart(clip: Clip, start: Seconds): Clip {
  const delta = start - clip.start;
  const moved = { ...clip, start, duration: clip.duration - delta };
  return moved.type === "media" ? { ...moved, offset: moved.offset + delta * rate(clip) } : moved;
}

const withEnd = (clip: Clip, end: Seconds): Clip => ({ ...clip, duration: end - clip.start });

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
  return Math.max(0, ...Object.values(project.clips).map(clipEnd));
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
  clip.offset + (t - clip.start) * clip.speed;

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
