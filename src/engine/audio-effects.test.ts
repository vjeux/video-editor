import { describe, expect, it } from "vite-plus/test";
import { AUDIO_EFFECTS } from "../core/audio-effects";
import { BUILT_AUDIO_EFFECTS } from "./audio-effects";

describe("audio effect engine", () => {
  it("can build every effect in the catalog, and nothing else", () => {
    expect([...BUILT_AUDIO_EFFECTS].sort()).toEqual(Object.keys(AUDIO_EFFECTS).sort());
  });
});
