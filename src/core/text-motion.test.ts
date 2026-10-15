import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_TEXT_SHADOW, createTextClip } from "./factories";
import { migrateProject } from "./migrate";
import { emptyProject, withClips } from "./fixtures.test-utils";
import {
  GLYPH_IDENTITY,
  karaokeAt,
  segmentText,
  TEXT_MOTION_PRESETS,
  textMotionLength,
  unitDelta,
} from "./text-motion";
import type { TextMotion } from "./types";

const motion = (presetId: string, patch: Partial<TextMotion> = {}): TextMotion => ({
  presetId,
  unit: "word",
  duration: 0.4,
  stagger: 0.1,
  easing: "linear",
  ...patch,
});

describe("segmentText", () => {
  it("splits into words per line, skipping spaces", () => {
    expect(segmentText("Hi there\nyou", "word").map((s) => [s.line, s.from, s.to, s.text])).toEqual(
      [
        [0, 0, 2, "Hi"],
        [0, 3, 8, "there"],
        [1, 0, 3, "you"],
      ],
    );
  });

  it("splits into letters without spaces and into whole lines", () => {
    expect(
      segmentText("Hi there", "letter")
        .map((s) => s.text)
        .join(""),
    ).toBe("Hithere");
    expect(segmentText("a b\nc", "line").map((s) => s.text)).toEqual(["a b", "c"]);
  });

  it("numbers units across lines", () => {
    expect(segmentText("a b\nc", "word").map((s) => s.index)).toEqual([0, 1, 2]);
  });
});

describe("unitDelta", () => {
  it("staggers each unit's entrance", () => {
    const m = motion("pop");
    expect(unitDelta(m, 0, 3, 0).scale).toBeCloseTo(0);
    expect(unitDelta(m, 0, 3, 0.2).scale).toBeCloseTo(0.5);
    expect(unitDelta(m, 1, 3, 0.2).scale).toBeCloseTo(0.25);
    expect(unitDelta(m, 2, 3, 0.2).scale).toBeCloseTo(0);
  });

  it("settles to the identity once a unit has entered", () => {
    expect(unitDelta(motion("slideUp"), 2, 3, 5)).toEqual(GLYPH_IDENTITY);
  });

  it("keeps continuous presets moving, offset per unit", () => {
    const m = motion("wave", { duration: 1 });
    expect(unitDelta(m, 0, 3, 0.25).dy).not.toBeCloseTo(0);
    expect(unitDelta(m, 0, 3, 0.25).dy).not.toBeCloseTo(unitDelta(m, 1, 3, 0.25).dy);
    expect(unitDelta(m, 0, 3, 5.25).dy).toBeCloseTo(unitDelta(m, 0, 3, 0.25).dy);
  });

  it("shows typewriter units all at once when their turn comes", () => {
    const m = motion("typewriter", { unit: "letter", duration: 0.01, stagger: 0.05 });
    expect(unitDelta(m, 3, 10, 0.14).opacity).toBe(0);
    expect(unitDelta(m, 3, 10, 0.16).opacity).toBe(1);
  });

  it("ships the caption favourites", () => {
    for (const id of [
      "pop",
      "slideUp",
      "slideDown",
      "fade",
      "bounce",
      "rotate",
      "zoom",
      "typewriter",
      "wave",
      "jiggle",
    ]) {
      expect(TEXT_MOTION_PRESETS[id], id).toBeDefined();
    }
  });
});

describe("textMotionLength", () => {
  it("is the last unit's start plus one duration", () => {
    expect(textMotionLength(motion("pop"), 5)).toBeCloseTo(0.8);
  });
});

describe("karaokeAt", () => {
  it("lights words evenly across the clip", () => {
    const clip = {
      ...createTextClip({ id: "t", trackId: "T1", start: 10, text: "one two three four" }),
      duration: 4,
    };
    expect(karaokeAt(clip, 10)).toEqual({ index: 0, fraction: 0 });
    expect(karaokeAt(clip, 11.5)).toEqual({ index: 1, fraction: 0.5 });
    expect(karaokeAt(clip, 14)).toEqual({ index: 3, fraction: 1 });
  });
});

describe("text style migration", () => {
  it("gives older titles the shadow they always rendered with", () => {
    const current = withClips(
      emptyProject(),
      createTextClip({ id: "t", trackId: "T1", start: 0, text: "x" }),
    );
    const v3 = JSON.parse(JSON.stringify({ ...current, version: 3 })) as {
      clips: { t: Record<string, unknown> & { style: Record<string, unknown> } };
    };
    for (const key of ["shadow", "glow", "gradient", "highlight", "shine"])
      delete v3.clips.t.style[key];
    delete v3.clips.t.textMotion;
    delete v3.clips.t.karaoke;
    const migrated = migrateProject(v3);
    expect(migrated).toEqual(current);
    expect(migrated.clips.t?.type === "text" && migrated.clips.t.style.shadow).toEqual(
      DEFAULT_TEXT_SHADOW,
    );
  });
});
