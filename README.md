<div align="center">

# Cutline

**A non-linear video editor that runs entirely in your browser.**
Import, cut, title, mix and export to MP4 — no uploads, no server, no install.

Built on [Mediabunny](https://mediabunny.dev/) + WebCodecs · React 19 · StyleX · [Vite+](https://viteplus.dev/)

</div>

![Cutline editing a four-shot teaser: program monitor with an animated title and transform handles, media bin, inspector and a multi-track timeline with filmstrips, waveforms and markers](docs/screenshot.png)

## Highlights

- **Everything stays on your device.** Decoding, preview and encoding use
  WebCodecs through Mediabunny. Projects and their media autosave to IndexedDB
  and reopen on reload.
- **A real multi-track timeline.** Video, audio and title tracks with
  filmstrips and waveforms. You can move clips (across tracks and in groups),
  trim, blade and split, ripple-delete, copy, paste and duplicate. Snapping
  covers edges, markers and the playhead. Tracks can be muted, soloed, hidden
  and locked. Drop a clip over others and it overwrites exactly the space it
  covers. Each clip shows its effect stack as chips (click one to bypass it),
  its in and out animations as bands with their easing curve (drag the edge
  to retime), its loop as a badge, and each transition as a labelled block
  over its cut (drag either edge to resize); right-click any of them for more.
- **What you see is what you export.** The live preview and the export share
  one compositor, and live playback and the export mixdown share one Web Audio
  scheduler.
- **Direct manipulation.** In the viewer, move, scale and rotate layers on the
  canvas with snapping to the centre and edges. Right-click anything for a
  context menu.
- **Effects, transitions and animations.** 76 GPU effects and 26 transitions
  built in, including the looks short-form editors lean on: punch-in and
  bouncy zooms, impact shake, flash, glitch, RGB split, light leaks and film
  burn. Stack effects per clip, filter everything below with adjustment
  layers, and give any clip In, Out and Loop animations.
- **Write your own effects.** The Effect Studio compiles GLSL live, with inline
  errors and parameters generated from your shader. You can also import
  gl-transitions shaders, `.cube` LUTs and effect packs.
- **Audio effects.** Voice enhance, EQ, compressor, reverb, echo, bass boost,
  telephone, megaphone, muffled, pitch shift, robot, distortion, tremolo,
  filter, pan and gain. They're heard in playback and baked into the export.
- **Captions and titles.** Type straight onto the monitor: double-click a
  title (or press `Enter`) to edit it in place. Eight bundled fonts with
  weight, tracking, colour, a box and an outline, plus text looks: adjustable drop shadow, neon glow,
  gradient fill, line or word highlight box and a sweeping shine. Per-letter,
  per-word or per-line animation (pop, slide, bounce, typewriter, wave, jiggle
  and more, with stagger and easing), karaoke word highlighting, and one-click
  Bold, Hormozi, Karaoke, Gaming, Neon and Gradient caption looks.
- **Clip controls.** Transform, opacity, volume up to 200%, speed from 0.1× to
  8×, velocity speed ramps, freeze frames (`F`) and fade in/out.
- **Export** to MP4 (H.264/AAC) or WebM (VP9/Opus) at any resolution. You get
  progress with an ETA, cancel, and an in-app preview, and the export can keep
  running in the background.
- **Scriptable.** Edit the timeline with JavaScript in a syntax-highlighted
  editor with API autocompletion. A whole script is one undo step.
- **Marker import** from chapter lists, CSV/TSV, SRT/WebVTT subtitles and
  LiveSplit `.lss` splits.

## Effects, transitions and animations

![Cutline with the Effects library open: GPU thumbnails, a clip's effect stack in the inspector, transition badges on the cuts and an adjustment layer](docs/screenshot-effects.jpg)

The choice of built-ins comes from looking at what popular editing styles rely
on: MrBeast/Hormozi-style YouTube, CapCut "velocity" edits and stream/podcast
clippers. Snappy zooms, flash and glitch cuts, impact shakes, speed ramps,
freeze-and-zoom and bold outlined captions come up again and again.

| Kind             | Built in                                                                                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color (14)       | Brightness/contrast, exposure, saturation + vibrance, hue, temperature/tint, lift/gamma/gain, B&W, sepia, invert, duotone, posterize, threshold, fade, colour isolate                                                               |
| Motion (4)       | Punch zoom (snap, bounce, slow push), zoom pulse, impact shake, Ken Burns                                                                                                                                                           |
| Blur (5)         | Gaussian, zoom, motion, tilt-shift, sharpen                                                                                                                                                                                         |
| Stylize (20)     | Vignette, grain, chromatic aberration, glow, pixelate, halftone, edges, emboss, toon, CRT, VHS, glitch, old film, night vision, thermal, kaleidoscope, letterbox, dither, light leak, flash                                         |
| Distort (7)      | Bulge, swirl, wave, ripple, mirror, shake, lens                                                                                                                                                                                     |
| Transitions (26) | Crossfade, fade through black/white, wipe, push, cover, zoom, zoom punch, zoom blur, iris, clock, diamond, dissolve, pixelate, whip, glitch, RGB split, flash, light leak, film burn, spin, ripple, swirl, luma wipe, doorway, cube |
| Animations       | **In/Out:** fade, slides, zoom in/out, pop, spin, drop, rise, elastic, bounce, shake, flicker, plus wipe/iris/blur/pixelate/glitch/dissolve reveals. **Loop:** pulse, breathe, float, wiggle, heartbeat, sway, spin                 |
| Speed ramps      | Velocity, montage, hero time, bullet, jump cut, flash in/out                                                                                                                                                                        |

- **Adding them:** drag an effect onto a clip, or a transition onto a cut,
  from the library panel. You can also double-click a tile or use the
  inspector.
- **Where transitions live:** a transition belongs to the cut. It only plays
  while the two clips touch, extends each clip half its duration past the
  cut, and holds on the edge frame when there's no extra footage.
- **Adjustment layers** filter everything composited below them.

## Write your own effects

![The Effect Studio editing a light-leak shader with live preview and generated parameters](docs/screenshot-studio.png)

Effects and transitions are GLSL ES 3.00 fragments. Your code is compiled
inside a host that provides the inputs and clocks:

```glsl
// @name Soft Glow
// @category Light
uniform float amount;  // = 0.6, min: 0, max: 2, label: Glow amount
uniform vec3 tint;     // = vec3(1.0, 0.8, 0.6)   → colour picker

vec4 effect(vec2 uv) {             // transitions: vec4 transition(vec2 uv)
  vec4 c = getColor(uv);           // getFromColor / getToColor for transitions
  return vec4(c.rgb + amount * 0.2 * tint * progress, c.a);
}
```

The host provides `progress` (0 → 1 across the clip or transition), `time`
(seconds), `ratio`, `resolution` and `applyLut(rgb)`. Every `uniform` with a
`// = default` comment becomes a slider, toggle, colour or vector in the UI.

You can import, by dragging onto the window or through the library's Import
button:

| File                      | Becomes                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `.glsl` / `.frag` / `.fs` | An effect or transition. [gl-transitions](https://gl-transitions.com) files work unchanged |
| `.cube`                   | A colour-grading LUT effect with an intensity control                                      |
| `.json`                   | An effect pack exported from Cutline (parameters are re-derived from the source)           |

Imported and custom effects must compile before they're added, and they're
saved inside the project.

## Quick start

Requires Node 22+ and the [Vite+](https://viteplus.dev/) CLI (`vp`).

```bash
vp install
vp dev
```

Open the printed URL in a recent Chrome, Edge, Safari or Firefox (WebCodecs is
required). Drop some video, audio or images onto the window and drag them onto
the timeline.

| Command    | What it does                                 |
| ---------- | -------------------------------------------- |
| `vp dev`   | Start the dev server                         |
| `vp check` | Format (Oxfmt), lint (Oxlint) and type-check |
| `vp test`  | Run the unit tests (Vitest)                  |
| `vp build` | Production build                             |

A pre-commit hook runs `vp check --fix` on staged files.

## Keyboard shortcuts

| Action                      | Keys                  |
| --------------------------- | --------------------- |
| Play / pause                | `Space`               |
| Step one frame / one second | `←` `→` / `⇧←` `⇧→`   |
| Freeze frame at playhead    | `F`                   |
| Go to start / end           | `Home` / `End`        |
| Split at playhead           | `S` or `⌘B`           |
| Delete / ripple delete      | `⌫` / `⇧⌫`            |
| Copy / paste / duplicate    | `⌘C` / `⌘V` / `⌘D`    |
| Select / blade tool         | `V` / `B`             |
| Add title / marker          | `T` / `M`             |
| Edit selected title         | `Enter`               |
| Toggle snapping / loop      | `N` / `L`             |
| Zoom timeline               | `+` `−`, or `⌘`+wheel |
| Undo / redo                 | `⌘Z` / `⇧⌘Z`          |

On Windows and Linux, `⌘` is `Ctrl`.

## Timeline scripting

Open **Script** in the top bar. The script runs against a draft of the project
using the same operations as the UI. It is applied as one undoable edit; if it
throws, nothing changes.

![The script dialog: a CodeMirror editor with syntax highlighting running a script that adds a caption per video clip](docs/screenshot-script.png)

```js
// Title every video clip from a list
const dates = ["February 12 2022", "April 12 2022"];
timeline.clips({ type: "video" }).forEach((clip, i) => {
  if (dates[i]) timeline.addText(dates[i], { start: clip.start, duration: 3, y: 380 });
});

// Clone an existing overlay with new text
timeline.clips({ type: "text" })[0].clone({ start: 10, text: "Another title" });
```

| API                                                                   | Description                                                    |
| --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `timeline.clips({ type?, track? })`                                   | Clip handles in time order (`video`, `audio`, `image`, `text`) |
| `timeline.add(asset, { start?, track? })`                             | Place a media asset by name or id                              |
| `timeline.addText(text, { start, duration, x, y, style, animation })` | Add a title                                                    |
| `timeline.addMarker(time, label)`                                     | Add a marker                                                   |
| `timeline.assets()` · `timeline.tracks()` · `duration` · `fps`        | Inspect the project                                            |
| `clip.set(patch)` · `move(start, track?)` · `trim(start?, end?)`      | Edit a clip                                                    |
| `clip.split(time)` · `clone(overrides)` · `remove()`                  | Restructure                                                    |
| `log(...values)`                                                      | Print to the script console                                    |

## Marker import

Use the upload button in the timeline toolbar. Each line or cue becomes a
labelled marker:

| Format             | Example                                              |
| ------------------ | ---------------------------------------------------- |
| Chapter list       | `0:00 Intro` · `1:30 - The climb` · `[12:04] Summit` |
| CSV / TSV          | `time,label` followed by `10.5,"Goal, finally"`      |
| SRT / WebVTT       | Each cue's start time and text                       |
| LiveSplit (`.lss`) | Each segment's personal-best split time and name     |

## Architecture

Dependencies point one way, and the core has none:

```text
ui ──► app ──► store ──► core
          └──► engine ──► core
```

| Layer         | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core`    | Pure TypeScript. Holds the project model and every edit (overwrite placement, move, trim, split, ripple, speed, ramps, paste), effect stacks, transitions, In/Out/Loop animations, the audio-effect catalog, shader metadata and `.cube` parsing, versioned migrations, timecode, scripting and annotation parsing. Unit-tested without a browser.                                                                                                                                                                                     |
| `src/effects` | The built-in shader library, written in the same uniform-comment format users import, plus effect lookup.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `src/engine`  | The Mediabunny and Web API adapter. `MediaLibrary` probes files, holds preview sinks, decodes audio and makes thumbnails. `FrameStream` serves frames for scrubbing and sequential playback. One compositor serves preview and export: `GpuEffects` runs effect chains, transitions and LUTs on WebGL2, and adjustment layers filter what's below them. One audio scheduler, with each clip's Web Audio effect chain, serves both playback and the mixdown. Also holds the exporter and IndexedDB persistence.                         |
| `src/store`   | Zustand stores. The editor store owns the project behind a single `commit()` writer with undo/redo; continuous gestures coalesce into one step.                                                                                                                                                                                                                                                                                                                                                                                        |
| `src/app`     | Commands that combine store and engine: import, the playback loop, keyboard and context-menu actions, session restore and autosave, and the single error-reporting seam.                                                                                                                                                                                                                                                                                                                                                               |
| `src/ui`      | React 19 with the React Compiler, one component per file, styled with StyleX (tokens in `ui/theme/tokens.stylex.ts`). Controls in `ui/controls` share two surfaces (recessed wells, raised plates) and one portalled `Popover` behind menus and dropdowns; its placement and the slider/scrub math are pure, unit-tested helpers. Uses `use()` + Suspense for session restore and codec probing, `useActionState` for export and scripts, `<Activity>` for dialogs that keep their state, and `<ViewTransition>` for animated dialogs. |

Some design choices worth knowing:

- **Playback follows the audio clock.** Video frames are pulled to the
  `AudioContext` time, so picture and sound cannot drift.
- **Frame-accurate scrubbing.** Each visible clip keeps a Mediabunny iterator.
  Small forward moves decode through; big jumps restart it, and the latest
  request wins.
- **Drag previews are the commit.** While you drag, the timeline renders the
  result of the same pure operation that runs on drop.

## Credits

Revived from [vjeux/video-editor](https://github.com/vjeux/video-editor) by
Christopher Chedeau. Media handling by
[Mediabunny](https://mediabunny.dev/). MIT licensed — see
[LICENSE.md](LICENSE.md).
