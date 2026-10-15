import { describe, expect, it } from "vite-plus/test";
import {
  addCaptions,
  chunkCaptions,
  cleanWords,
  mergeWindows,
  transcriptionWindows,
  wordsOnTimeline,
  type CaptionOptions,
} from "./captions";
import { createMediaClip } from "./factories";
import {
  emptyProject,
  sequentialIds,
  textClip,
  videoAsset,
  withClips,
} from "./fixtures.test-utils";
import { migrateProject } from "./migrate";
import { sourceTimeAt, timelineTimeOf } from "./timeline";
import type { MediaClip, TextClip, TimedWord } from "./types";

const w = (text: string, start: number, end: number): TimedWord => ({ text, start, end });

describe("cleanWords", () => {
  it("trims, and drops empty and non-speech tokens", () => {
    expect(
      cleanWords([
        { text: " Welcome", start: 0.28, end: 0.54 },
        { text: " [BLANK_AUDIO]", start: 0.6, end: 1 },
        { text: " (music)", start: 1, end: 2 },
        { text: " ", start: 2, end: 2.1 },
        { text: " back", start: 2.2, end: 2.5 },
      ]),
    ).toEqual([w("Welcome", 0.28, 0.54), w("back", 2.2, 2.5)]);
  });

  it("joins pieces without a leading space onto the previous word", () => {
    expect(
      cleanWords([
        { text: " Hel", start: 0, end: 0.2 },
        { text: "lo", start: 0.2, end: 0.4 },
        { text: ",", start: 0.4, end: 0.4 },
      ]),
    ).toEqual([w("Hello,", 0, 0.4)]);
  });

  it("gives every word a minimum length without running into the next", () => {
    expect(
      cleanWords([
        { text: " a", start: 1, end: 1.01 },
        { text: " b", start: 1.05, end: null },
        { text: " end.", start: 6.06, end: 6.08 },
      ]),
    ).toEqual([w("a", 1, 1.05), w("b", 1.05, 6.06), w("end.", 6.06, 6.18)]);
  });
});

describe("transcriptionWindows", () => {
  it("is one window for short audio", () => {
    expect(transcriptionWindows(20)).toEqual([{ start: 0, end: 20, keepFrom: 0, keepTo: 20 }]);
  });

  it("overlaps windows and splits ownership in the middle of each overlap", () => {
    expect(transcriptionWindows(70, 30, 4)).toEqual([
      { start: 0, end: 30, keepFrom: 0, keepTo: 28 },
      { start: 26, end: 56, keepFrom: 28, keepTo: 54 },
      { start: 52, end: 70, keepFrom: 54, keepTo: 70 },
    ]);
  });
});

describe("mergeWindows", () => {
  it("keeps each word once, from the window owning its midpoint", () => {
    const [first, second] = transcriptionWindows(56, 30, 4);
    if (!first || !second) throw new Error("expected two windows");
    expect(
      mergeWindows([
        { window: first, words: [w("a", 10, 10.4), w("b", 27.5, 27.9), w("c", 28.2, 28.6)] },
        { window: second, words: [w("b", 1.5, 1.9), w("c", 2.2, 2.6), w("d", 5, 5.5)] },
      ]),
    ).toEqual([w("a", 10, 10.4), w("b", 27.5, 27.9), w("c", 28.2, 28.6), w("d", 31, 31.5)]);
  });

  it("keeps a last word timed past the end of the audio, clamped to it", () => {
    const [only] = transcriptionWindows(6.3);
    if (!only) throw new Error("expected a window");
    expect(mergeWindows([{ window: only, words: [w("end.", 6.12, 8.46)] }])).toEqual([
      w("end.", 6.12, 6.3),
    ]);
  });
});

const OPTIONS: CaptionOptions = {
  maxWords: 3,
  maxChars: 40,
  maxGap: 0.5,
  hold: 0.4,
  uppercase: false,
  stripPunctuation: false,
};

describe("chunkCaptions", () => {
  const words = [
    w("One", 0, 0.3),
    w("two", 0.3, 0.6),
    w("three.", 0.6, 1),
    w("Four", 1.1, 1.4),
    w("five", 2.5, 2.8),
    w("six", 2.8, 3.1),
  ];

  it("breaks after sentences, on long pauses and at the word limit", () => {
    expect(chunkCaptions(words, OPTIONS).map((c) => c.text)).toEqual([
      "One two three.",
      "Four",
      "five six",
    ]);
  });

  it("bridges short gaps to the next caption and holds after long ones", () => {
    expect(chunkCaptions(words, OPTIONS).map((c) => [c.start, c.end])).toEqual([
      [0, 1.1],
      [1.1, 1.8],
      [2.5, 3.5],
    ]);
  });

  it("times words relative to their caption", () => {
    expect(chunkCaptions(words, OPTIONS)[2]?.words).toEqual([
      w("five", 0, 0.3),
      w("six", 0.3, 0.6),
    ]);
  });

  it("breaks after a clause once the caption is half full", () => {
    const said = [
      w("Welcome", 0, 0.3),
      w("back", 0.3, 0.5),
      w("to", 0.5, 0.6),
      w("the", 0.6, 0.8),
      w("channel,", 0.8, 1.2),
      w("today", 1.3, 1.5),
      w("we", 1.5, 1.7),
      w("are", 1.7, 2),
    ];
    expect(chunkCaptions(said, OPTIONS).map((c) => c.text)).toEqual([
      "Welcome back to",
      "the channel,",
      "today we are",
    ]);
  });

  it("breaks before exceeding the character limit", () => {
    const short = [w("a", 0, 0.1), w("bb", 0.1, 0.2), w("ccc", 0.2, 0.3), w("dddd", 0.3, 0.4)];
    expect(
      chunkCaptions(short, { ...OPTIONS, maxWords: 10, maxChars: 6 }).map((c) => c.text),
    ).toEqual(["a bb", "ccc", "dddd"]);
  });

  it("can upper-case and strip punctuation, keeping inner apostrophes", () => {
    const said = [w("Don't", 0, 0.2), w("stop,", 0.2, 0.4), w("ok?", 0.4, 0.6)];
    const [caption] = chunkCaptions(said, {
      ...OPTIONS,
      maxWords: 5,
      uppercase: true,
      stripPunctuation: true,
    });
    expect(caption?.text).toBe("DON'T STOP OK");
    expect(caption?.words.map((x) => x.text)).toEqual(["DON'T", "STOP", "OK"]);
  });
});

describe("timelineTimeOf", () => {
  const clip: MediaClip = {
    ...(createMediaClip(videoAsset, { id: "v", trackId: "V1", start: 10 }) as MediaClip),
    offset: 5,
    speed: 2,
    duration: 4,
  };

  it("inverts the clip's source mapping", () => {
    expect(timelineTimeOf(clip, 9)).toBe(12);
  });

  it("is null outside the clip's source range", () => {
    expect(timelineTimeOf(clip, 4.9)).toBeNull();
    expect(timelineTimeOf(clip, 13.1)).toBeNull();
  });

  it("inverts speed ramps", () => {
    const ramped = { ...clip, speedRamp: "montage" };
    const t = timelineTimeOf(ramped, 8);
    expect(t).not.toBeNull();
    expect(sourceTimeAt(ramped, t ?? 0)).toBeCloseTo(8, 4);
  });
});

describe("wordsOnTimeline", () => {
  it("maps source words onto the timeline and drops those outside the clip", () => {
    const clip: MediaClip = {
      ...(createMediaClip(videoAsset, { id: "v", trackId: "V1", start: 10 }) as MediaClip),
      offset: 5,
      duration: 4,
    };
    expect(wordsOnTimeline(clip, [w("cut", 4, 4.5), w("in", 6, 6.5), w("late", 8.5, 9.5)])).toEqual(
      [w("in", 11, 11.5), w("late", 13.5, 14)],
    );
  });
});

describe("addCaptions", () => {
  const look = {
    style: { fontSize: 80, color: "#ffee00" },
    textMotion: null,
    karaoke: { color: "#ffee00", mode: "pop" as const },
  };
  const chunks = () =>
    chunkCaptions([w("Hello", 1, 1.5), w("there.", 1.5, 2), w("Bye", 3, 3.3)], OPTIONS);

  it("puts the captions on a new title track on top, leaving other titles alone", () => {
    const project = withClips(emptyProject(), textClip("title", 0, 10));
    const result = addCaptions(project, chunks(), look, sequentialIds("c"));
    expect(result.project.tracks[0]).toMatchObject({
      id: result.trackId,
      kind: "text",
      name: "Captions",
    });
    expect(result.project.clips.title).toEqual(project.clips.title);
    expect(result.clipIds).toHaveLength(2);
  });

  it("creates one timed title per caption in the chosen look, in the lower third", () => {
    const result = addCaptions(emptyProject(), chunks(), look, sequentialIds("c"));
    const [first] = result.clipIds.map((id) => result.project.clips[id] as TextClip);
    expect(first).toMatchObject({
      type: "text",
      text: "Hello there.",
      start: 1,
      duration: 1.4,
      animation: "none",
      karaoke: look.karaoke,
      words: [w("Hello", 0, 0.5), w("there.", 0.5, 1)],
      transform: { x: 0, y: 302 },
    });
    expect(first?.style).toMatchObject({
      fontSize: 80,
      color: "#ffee00",
      fontFamily: "Inter Variable",
    });
  });
});

describe("caption words in saved projects", () => {
  it("default to none on titles saved before captions existed", () => {
    const { words: _, ...old } = textClip("t", 0, 2) as TextClip;
    const project = migrateProject({ ...withClips(emptyProject()), clips: { t: old } });
    expect((project.clips.t as TextClip).words).toBeNull();
  });
});
