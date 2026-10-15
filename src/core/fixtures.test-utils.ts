import { createMediaClip, createProject, createTextClip, createTrack } from "./factories";
import type { Asset, Clip, IdFactory, Project } from "./types";

export const videoAsset: Asset = {
  id: "a-video",
  name: "sunset.mp4",
  kind: "video",
  duration: 20,
  width: 1920,
  height: 1080,
  hasAudio: true,
};

export const audioAsset: Asset = {
  id: "a-audio",
  name: "score.mp3",
  kind: "audio",
  duration: 60,
  width: 0,
  height: 0,
  hasAudio: true,
};

export const imageAsset: Asset = {
  id: "a-image",
  name: "logo.png",
  kind: "image",
  duration: null,
  width: 800,
  height: 800,
  hasAudio: false,
};

export function sequentialIds(prefix = "id"): IdFactory {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

/** V1 (video), A1 (audio), T1 (text) with the three fixture assets registered. */
export function emptyProject(): Project {
  const project = createProject({ name: "Test" });
  return {
    ...project,
    assets: {
      [videoAsset.id]: videoAsset,
      [audioAsset.id]: audioAsset,
      [imageAsset.id]: imageAsset,
    },
    tracks: [
      createTrack("text", "T1", "Titles"),
      createTrack("video", "V1", "Main"),
      createTrack("audio", "A1", "Music"),
    ],
  };
}

export function withClips(project: Project, ...clips: Clip[]): Project {
  return {
    ...project,
    clips: { ...project.clips, ...Object.fromEntries(clips.map((c) => [c.id, c])) },
  };
}

export function videoClip(id: string, start: number, duration: number, offset = 0): Clip {
  return { ...createMediaClip(videoAsset, { id, trackId: "V1", start }), duration, offset };
}

export function textClip(id: string, start: number, duration: number): Clip {
  return { ...createTextClip({ id, trackId: "T1", start, text: "Hello" }), duration };
}

export function clipsOn(project: Project, trackId: string) {
  return Object.values(project.clips)
    .filter((c) => c.trackId === trackId)
    .sort((a, b) => a.start - b.start)
    .map((c) => ({ id: c.id, start: c.start, duration: c.duration }));
}
