import { describe, expect, it } from "vite-plus/test";
import { parseAnnotations, parseTime } from "./annotations";

describe("parseTime", () => {
  it("reads h:mm:ss, m:ss, fractional and comma-separated milliseconds", () => {
    expect(parseTime("1:02:03")).toBe(3723);
    expect(parseTime("2:05")).toBe(125);
    expect(parseTime("00:00:01.500")).toBe(1.5);
    expect(parseTime("00:00:01,250")).toBe(1.25);
    expect(parseTime("42.5")).toBe(42.5);
    expect(parseTime("soon")).toBeNull();
  });
});

describe("parseAnnotations", () => {
  it("reads YouTube-style chapter lists", () => {
    expect(parseAnnotations("0:00 Intro\n1:30 - The climb\n[12:04] Summit")).toEqual([
      { time: 0, label: "Intro" },
      { time: 90, label: "The climb" },
      { time: 724, label: "Summit" },
    ]);
  });

  it("reads CSV and TSV rows, skipping a header", () => {
    expect(parseAnnotations('time,label\n5,Kickoff\n10.5,"Goal, finally"')).toEqual([
      { time: 5, label: "Kickoff" },
      { time: 10.5, label: "Goal, finally" },
    ]);
    expect(parseAnnotations("3\tTab")).toEqual([{ time: 3, label: "Tab" }]);
  });

  it("reads SRT and WebVTT cues by their start time", () => {
    const srt =
      "1\n00:00:01,000 --> 00:00:02,000\nHello there\n\n2\n00:00:05,500 --> 00:00:07,000\nSecond line\nwraps";
    expect(parseAnnotations(srt)).toEqual([
      { time: 1, label: "Hello there" },
      { time: 5.5, label: "Second line wraps" },
    ]);
    const vtt = "WEBVTT\n\n00:01.000 --> 00:02.000\nCue";
    expect(parseAnnotations(vtt)).toEqual([{ time: 1, label: "Cue" }]);
  });

  it("reads LiveSplit personal-best split times", () => {
    const lss = `<Run><Segments>
      <Segment><Name>Level 1</Name><SplitTimes><SplitTime name="Personal Best"><RealTime>00:01:10.5000000</RealTime></SplitTime></SplitTimes></Segment>
      <Segment><Name>Boss</Name><SplitTimes><SplitTime name="Personal Best"><RealTime>00:03:00.0000000</RealTime></SplitTime></SplitTimes></Segment>
    </Segments></Run>`;
    expect(parseAnnotations(lss)).toEqual([
      { time: 70.5, label: "Level 1" },
      { time: 180, label: "Boss" },
    ]);
  });

  it("ignores lines without a time and sorts by time", () => {
    expect(parseAnnotations("notes\n2:00 B\n1:00 A")).toEqual([
      { time: 60, label: "A" },
      { time: 120, label: "B" },
    ]);
  });
});
