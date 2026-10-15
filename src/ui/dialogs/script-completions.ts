import type { Completion, CompletionContext, CompletionResult } from "@codemirror/autocomplete";

const TIMELINE_MEMBERS: readonly Completion[] = [
  {
    label: "clips",
    type: "method",
    detail: "({ type?, track? })",
    info: "Clip handles, optionally filtered by kind or track label.",
  },
  {
    label: "add",
    type: "method",
    detail: "(assetName, { start?, track? })",
    info: "Place a media asset on the timeline.",
  },
  {
    label: "addText",
    type: "method",
    detail: "(text, { start, duration, y, style })",
    info: "Add a title clip.",
  },
  {
    label: "addMarker",
    type: "method",
    detail: "(time, label?)",
    info: "Drop a marker at a time in seconds.",
  },
  { label: "assets", type: "method", detail: "()", info: "Imported assets: name, kind, duration." },
  { label: "tracks", type: "method", detail: "()", info: "Tracks: label, name, kind." },
  { label: "duration", type: "property", detail: "number", info: "Project duration in seconds." },
  { label: "fps", type: "property", detail: "number", info: "Project frame rate." },
];

const CLIP_MEMBERS: readonly Completion[] = [
  {
    label: "set",
    type: "method",
    detail: "(patch)",
    info: "Update clip properties (transform, style, …).",
  },
  {
    label: "move",
    type: "method",
    detail: "(start, track?)",
    info: "Move to a new start time, optionally to another track.",
  },
  {
    label: "trim",
    type: "method",
    detail: "(start?, end?)",
    info: "Trim the clip to new timeline bounds.",
  },
  {
    label: "split",
    type: "method",
    detail: "(time)",
    info: "Split at a timeline time; returns the right part.",
  },
  { label: "remove", type: "method", detail: "()", info: "Delete the clip." },
  {
    label: "clone",
    type: "method",
    detail: "({ start?, track?, text? })",
    info: "Duplicate with overrides.",
  },
  { label: "type", type: "property", detail: "string", info: "video | audio | image | text" },
  { label: "start", type: "property", detail: "number", info: "Start time in seconds." },
  { label: "duration", type: "property", detail: "number", info: "Length in seconds." },
  { label: "end", type: "property", detail: "number", info: "End time in seconds." },
  { label: "track", type: "property", detail: "string", info: "Track label, e.g. V1." },
  { label: "text", type: "property", detail: "string", info: "Title text (text clips)." },
  { label: "asset", type: "property", detail: "string", info: "Source asset name (media clips)." },
];

const GLOBALS: readonly Completion[] = [
  { label: "timeline", type: "variable", detail: "Timeline", info: "The project timeline API." },
  { label: "log", type: "function", detail: "(...values)", info: "Print to the script console." },
];

/** Receivers that look like clip handles: `clip.`, `c.`, `…Clip.`, or call/index results. */
const CLIP_RECEIVER = /(?:\b(?:c|\w*[cC]lip\w*)|[)\]])$/;

/** Completion source for the timeline script API, merged with the JavaScript defaults. */
export function scriptCompletions(context: CompletionContext): CompletionResult | null {
  const member = context.matchBefore(/\.[\w$]*$/);
  if (member) {
    const receiver = context.state.sliceDoc(Math.max(0, member.from - 40), member.from);
    const options = /\btimeline$/.test(receiver)
      ? TIMELINE_MEMBERS
      : CLIP_RECEIVER.test(receiver)
        ? CLIP_MEMBERS
        : null;
    return options ? { from: member.from + 1, options, validFor: /^[\w$]*$/ } : null;
  }
  const word = context.matchBefore(/[\w$]+$/);
  if (!word && !context.explicit) return null;
  return { from: word?.from ?? context.pos, options: GLOBALS, validFor: /^[\w$]*$/ };
}
