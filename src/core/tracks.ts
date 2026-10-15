import { createTrack, TRACK_ACCEPTS, TRACK_PREFIX } from "./factories";
import type { ClipKind, Id, IdFactory, Project, Track, TrackKind } from "./types";

const TRACK_NAMES: Record<TrackKind, string> = { video: "Video", audio: "Audio", text: "Titles" };

/** Where a new track of each kind goes: titles on top, video above video, audio last. */
const INSERT_AT: Record<TrackKind, (tracks: Track[]) => number> = {
  text: () => 0,
  video: (tracks) => {
    const firstVideo = tracks.findIndex((t) => t.kind === "video");
    return firstVideo >= 0 ? firstVideo : tracks.filter((t) => t.kind === "text").length;
  },
  audio: (tracks) => tracks.length,
};

export function addTrack(
  project: Project,
  kind: TrackKind,
  id: Id,
): { project: Project; trackId: Id } {
  const count = project.tracks.filter((t) => t.kind === kind).length;
  const name =
    kind === "text" && count === 0 ? TRACK_NAMES.text : `${TRACK_NAMES[kind]} ${count + 1}`;
  const tracks = [...project.tracks];
  tracks.splice(INSERT_AT[kind](tracks), 0, createTrack(kind, id, name));
  return { project: { ...project, tracks }, trackId: id };
}

const KIND_TRACK = Object.fromEntries(
  Object.entries(TRACK_ACCEPTS).flatMap(([track, kinds]) => kinds.map((k) => [k, track])),
) as Record<ClipKind, TrackKind>;

/** First unlocked track accepting `kind`, creating one if needed. */
export function trackFor(
  project: Project,
  kind: ClipKind,
  newId: IdFactory,
): { project: Project; trackId: Id } {
  const existing = project.tracks.find((t) => !t.locked && TRACK_ACCEPTS[t.kind].includes(kind));
  return existing
    ? { project, trackId: existing.id }
    : addTrack(project, KIND_TRACK[kind], newId());
}

export function removeTrack(project: Project, trackId: Id): Project {
  return {
    ...project,
    tracks: project.tracks.filter((t) => t.id !== trackId),
    clips: Object.fromEntries(
      Object.entries(project.clips).filter(([, c]) => c.trackId !== trackId),
    ),
  };
}

/** "V1" is the bottom-most video track, as in conventional NLEs. */
export function trackLabel(project: Project, trackId: Id): string {
  const index = project.tracks.findIndex((t) => t.id === trackId);
  const track = project.tracks[index];
  if (!track) throw new Error(`Unknown track ${trackId}`);
  const sameKind = project.tracks.filter((t) => t.kind === track.kind);
  const position = sameKind.indexOf(track);
  const number = track.kind === "audio" ? position + 1 : sameKind.length - position;
  return `${TRACK_PREFIX[track.kind]}${number}`;
}
