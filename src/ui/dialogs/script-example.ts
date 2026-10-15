export const SCRIPT_STORAGE_KEY = "cutline:script";

export const SCRIPT_EXAMPLE = `// Edit the timeline with JavaScript — the whole script is one undo step.
// timeline.clips({ type?: "video" | "audio" | "image" | "text", track?: "V1" })
// timeline.add(assetName, { start?, track? })  ·  timeline.addText(text, { start, duration, y, style })
// timeline.addMarker(time, label)  ·  timeline.assets()  ·  timeline.tracks()
// clip.set({...}) · clip.move(start, track?) · clip.trim(start?, end?)
// clip.split(time) · clip.clone({ start, text }) · clip.remove() · log(...)

const captions = ["Day one", "Into the hills", "Golden hour"];

timeline.clips({ type: "video" }).forEach((clip, i) => {
  if (!captions[i]) return;
  timeline.addText(captions[i], {
    start: clip.start + 0.5,
    duration: Math.min(3, clip.duration - 0.5),
    y: 380,
    animation: "rise",
    style: { fontSize: 72 },
  });
});

log("Titles:", timeline.clips({ type: "text" }).length);
`;
