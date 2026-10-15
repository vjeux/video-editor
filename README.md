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
  covers.
- **What you see is what you export.** The live preview and the export share
  one compositor, and live playback and the export mixdown share one Web Audio
  scheduler.
- **Direct manipulation.** In the viewer, move, scale and rotate layers on the
  canvas with snapping to the centre and edges. Right-click anything for a
  context menu.
- **Titles that move.** Choose from six bundled fonts, with weight, tracking,
  colour, a background box and alignment. Animations are fade, rise, typewriter
  and blur.
- **Clip controls.** Transform, opacity, volume up to 200%, speed from 0.1× to
  8×, and fade in/out.
- **Export** to MP4 (H.264/AAC) or WebM (VP9/Opus) at any resolution. You get
  progress with an ETA, cancel, and an in-app preview, and the export can keep
  running in the background.
- **Scriptable.** Edit the timeline with JavaScript in a syntax-highlighted
  editor with API autocompletion. A whole script is one undo step.
- **Marker import** from chapter lists, CSV/TSV, SRT/WebVTT subtitles and
  LiveSplit `.lss` splits.

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
| Go to start / end           | `Home` / `End`        |
| Split at playhead           | `S` or `⌘B`           |
| Delete / ripple delete      | `⌫` / `⇧⌫`            |
| Copy / paste / duplicate    | `⌘C` / `⌘V` / `⌘D`    |
| Select / blade tool         | `V` / `B`             |
| Add title / marker          | `T` / `M`             |
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

| Layer        | Responsibility                                                                                                                                                                                                                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core`   | Pure TypeScript. Holds the project model and every edit (overwrite placement, move, trim, split, ripple, speed, paste), snapping, fades and title animation, timecode, scripting and annotation parsing. Unit-tested without a browser.                                                                                                            |
| `src/engine` | The Mediabunny and Web API adapter. `MediaLibrary` probes files, holds preview sinks, decodes audio and makes thumbnails. `FrameStream` serves frames for scrubbing and sequential playback. One compositor serves preview and export, and one audio scheduler serves playback and the mixdown. Also holds the exporter and IndexedDB persistence. |
| `src/store`  | Zustand stores. The editor store owns the project behind a single `commit()` writer with undo/redo; continuous gestures coalesce into one step.                                                                                                                                                                                                    |
| `src/app`    | Commands that combine store and engine: import, the playback loop, keyboard and context-menu actions, session restore and autosave, and the single error-reporting seam.                                                                                                                                                                           |
| `src/ui`     | React 19 with the React Compiler, one component per file, styled with StyleX (tokens in `ui/theme/tokens.stylex.ts`). Uses `use()` + Suspense for session restore and codec probing, `useActionState` for export and scripts, `<Activity>` for dialogs that keep their state, and `<ViewTransition>` for animated dialogs.                         |

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
