// Browser half of the long-media benchmark. The Vite dev server serves this
// file and resolves its imports, so the `/src/...` modules below are the very
// instances the running editor uses.
import {
  ALL_FORMATS,
  AudioBufferSource,
  BlobSource,
  CanvasSource,
  EncodedPacketSink,
  getFirstEncodableVideoCodec,
  Input,
  Mp4OutputFormat,
  Output,
  StreamTarget,
} from "mediabunny";

const SAMPLE_RATE = 48_000;
const opfs = () => navigator.storage.getDirectory();

async function opfsFile(name) {
  try {
    return await (await (await opfs()).getFileHandle(name)).getFile();
  } catch {
    return null;
  }
}

async function writeOpfs(name, text) {
  const writable = await (
    await (await opfs()).getFileHandle(name, { create: true })
  ).createWritable();
  await writable.write(text);
  await writable.close();
}

/**
 * A synthetic MP4 written straight to OPFS (never held in memory): a moving
 * bar over a frame counter, or full-frame noise for a high-bitrate file,
 * with a 440 Hz tone that pauses for one second in every ten.
 * Cached by name and parameters across runs.
 */
export async function generate(spec) {
  const key = JSON.stringify(spec);
  const meta = await opfsFile(`${spec.name}.json`);
  const cached = await opfsFile(spec.name);
  if (meta && cached && (await meta.text()) === key) return { size: cached.size, cached: true };

  const { name, seconds, width, height, fps, bitrate, noise } = spec;
  const handle = await (await opfs()).getFileHandle(name, { create: true });
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: false }),
    target: new StreamTarget(await handle.createWritable(), { chunked: true }),
  });
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { alpha: false });
  const codec = await getFirstEncodableVideoCodec(["avc"], { width, height, bitrate });
  if (!codec) throw new Error("This browser cannot encode H.264");
  const video = new CanvasSource(canvas, { codec, bitrate, latencyMode: "realtime" });
  const audio = new AudioBufferSource({ codec: "aac", bitrate: 96_000 });
  output.addVideoTrack(video, { frameRate: fps });
  output.addAudioTrack(audio);
  await output.start();

  let texture = null;
  if (noise) {
    texture = new OffscreenCanvas(width * 2, height * 2);
    const tctx = texture.getContext("2d");
    const data = tctx.createImageData(texture.width, texture.height);
    for (let i = 0; i < data.data.length; i++) data.data[i] = (Math.random() * 256) | 0;
    tctx.putImageData(data, 0, 0);
  }

  for (let s = 0; s < seconds; s++) {
    for (let f = 0; f < fps; f++) {
      const frame = s * fps + f;
      if (texture) {
        ctx.drawImage(texture, -((frame * 7919) % width), -((frame * 104729) % height));
      } else {
        ctx.fillStyle = `hsl(${(s * 3) % 360} 40% 20%)`;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#fff";
        ctx.fillRect(((frame % fps) / fps) * width, 0, width / fps, height / 4);
        ctx.font = `${Math.round(height / 4)}px sans-serif`;
        ctx.fillText(String(frame), 8, height - 8);
      }
      await video.add(frame / fps, 1 / fps);
    }
    const buffer = new AudioBuffer({
      length: SAMPLE_RATE,
      numberOfChannels: 2,
      sampleRate: SAMPLE_RATE,
    });
    if (s % 10 !== 9) {
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++)
          data[i] = 0.3 * Math.sin((2 * Math.PI * 440 * (s * SAMPLE_RATE + i)) / SAMPLE_RATE);
      }
    }
    await audio.add(buffer);
  }
  await output.finalize();
  await writeOpfs(`${name}.json`, key);
  return { size: (await handle.getFile()).size, cached: false };
}

const modules = async () => {
  const [assets, store, engine, playback, projectFiles, exporter, persistence] = await Promise.all([
    import("/src/app/assets.ts"),
    import("/src/store/index.ts"),
    import("/src/app/engine.ts"),
    import("/src/app/playback.ts"),
    import("/src/app/project-files.ts"),
    import("/src/engine/export.ts"),
    import("/src/engine/persistence.ts"),
  ]);
  return { assets, store, engine, playback, projectFiles, exporter, persistence };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(check, timeoutMs, what) {
  const deadline = performance.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (performance.now() > deadline) throw new Error(`Timed out waiting for ${what}`);
    await sleep(100);
  }
}

/** Waits until every asset in the bin has finished loading (posters, filmstrip, waveform). */
async function assetsSettled(m, timeoutMs) {
  return until(
    () => {
      const project = m.store.editorStore.getState().project;
      const runtime = m.store.mediaStore.getState().assets;
      return Object.values(project.assets).every((asset) => {
        const r = runtime[asset.id];
        if (r?.status === "error") throw new Error(r.error);
        return r?.status === "ready" && r.filmstrip && (!asset.hasAudio || r.peaks);
      });
    },
    timeoutMs,
    "assets to load",
  );
}

export async function resetProject() {
  const m = await modules();
  const editor = m.store.editorStore.getState();
  editor.commit((p) => ({
    ...p,
    assets: {},
    clips: {},
    tracks: p.tracks.map((t) => ({ ...t, clipIds: [] })),
  }));
}

/** Imports an OPFS file into the bin and places it on the timeline. */
export async function importMedia(name, timeoutMs) {
  const m = await modules();
  const file = await opfsFile(name);
  if (!file) throw new Error(`${name} has not been generated`);
  const started = performance.now();
  await m.assets.importFiles([new File([file], name, { type: "video/mp4" })]);
  await assetsSettled(m, timeoutMs);
  const project = m.store.editorStore.getState().project;
  const asset = Object.values(project.assets).find((a) => a.name === name);
  m.assets.addAssetToTimeline(asset.id, { start: 0 });
  const stored = await until(
    async () => (await m.persistence.storedMediaIds()).includes(asset.id) || null,
    timeoutMs,
    "the IndexedDB copy",
  ).catch((error) => error.message);
  return { seconds: (performance.now() - started) / 1000, stored: stored === true ? true : stored };
}

/**
 * Starts playback in the middle of the timeline and plays for `seconds`,
 * listening to the output: the generated tone is continuous except for its
 * silent tenth seconds, so a 10 ms frame that drops out inside a tone
 * second is a seam or underrun.
 */
export async function playMiddle(seconds) {
  const m = await modules();
  const { editorStore } = m.store;
  const { player } = m.engine;
  const project = editorStore.getState().project;
  const end = Object.values(project.clips).reduce(
    (max, c) => Math.max(max, c.start + c.duration),
    0,
  );
  const from = Math.floor(end / 2) + 0.5;
  editorStore.getState().setPlayhead(from);
  const started = performance.now();
  m.playback.play();

  // Tap the master bus (private fields are reachable from plain JS).
  const ctx = player.ctx;
  const tap = ctx.createScriptProcessor(4096, 2, 2);
  const captured = [];
  let firstAt = null;
  tap.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    if (firstAt === null && data.some((v) => v !== 0)) firstAt = e.playbackTime;
    captured.push({ at: e.playbackTime, data: Float32Array.from(data) });
  };
  player.master.connect(tap);
  tap.connect(ctx.destination);

  const audible = await until(
    () => (player.nodes?.size ?? player.nodes?.length ?? 0) > 0,
    60_000,
    "audio",
  )
    .then(() => (performance.now() - started) / 1000)
    .catch(() => null);
  await sleep(seconds * 1000);
  const position = player.time();
  m.playback.pause();
  player.master.disconnect(tap);
  tap.disconnect();

  // 10 ms frames, timed from the first sound heard (to within one 4096-sample
  // block, hence the generous margins around each silent second).
  const rate = ctx.sampleRate;
  const frame = Math.round(rate / 100);
  const samples = new Float32Array(captured.reduce((n, c) => n + c.data.length, 0));
  let offset = 0;
  for (const c of captured) samples.set(c.data, (offset += c.data.length) - c.data.length);
  const startTime = captured[0]?.at ?? 0;
  let dropouts = 0;
  let checked = 0;
  for (let i = 0; i + frame <= samples.length; i += frame) {
    const t = startTime + i / rate;
    if (firstAt === null || t < firstAt + 0.1) continue;
    let sum = 0;
    for (let j = i; j < i + frame; j++) sum += samples[j] * samples[j];
    const rms = Math.sqrt(sum / frame);
    // Skip frames near a silent second (source seconds 9, 19, 29, …).
    const second = Math.floor((t - firstAt + from) % 10);
    const into = (t - firstAt + from) % 1;
    if (second === 9 || second === 8 || second === 0 || into < 0.05 || into > 0.95) continue;
    checked++;
    if (rms < 0.1) dropouts++;
  }
  return { audioAfter: audible, played: position - from, checkedFrames: checked, dropouts };
}

/** Counts what a finished export holds, from the file itself. */
async function readBack(blob) {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(blob) });
  try {
    const video = await input.getPrimaryVideoTrack();
    const audio = await input.getPrimaryAudioTrack();
    let frames = 0;
    const sink = new EncodedPacketSink(video);
    for (
      let p = await sink.getFirstPacket({ metadataOnly: true });
      p;
      p = await sink.getNextPacket(p, { metadataOnly: true })
    )
      frames++;
    let audioSeconds = 0;
    if (audio) {
      const asink = new EncodedPacketSink(audio);
      for (
        let p = await asink.getFirstPacket({ metadataOnly: true });
        p;
        p = await asink.getNextPacket(p, { metadataOnly: true })
      )
        audioSeconds = Math.max(audioSeconds, p.timestamp + p.duration);
    }
    return { bytes: blob.size, frames, audioSeconds, duration: await input.computeDuration() };
  } finally {
    input.dispose();
  }
}

/**
 * Exports the timeline at its own size. Where the editor can stream to a
 * file, `showSaveFilePicker` is stubbed with an OPFS handle.
 */
export async function exportTimeline(name) {
  const m = await modules();
  const project = m.store.editorStore.getState().project;
  const handle = await (await opfs()).getFileHandle(name, { create: true });
  window.showSaveFilePicker = async () => handle;
  const started = performance.now();
  let lastProgress = 0;
  const result = await m.exporter.exportProject(project, m.engine.media, {
    format: "mp4",
    quality: "low",
    height: project.settings.height,
    signal: new AbortController().signal,
    onProgress: (p) => (lastProgress = p),
    destination: handle,
  });
  const seconds = (performance.now() - started) / 1000;
  // Before streaming exports, exportProject returned the Blob itself.
  const inMemory = result instanceof Blob || result.kind === "blob";
  const file = result instanceof Blob ? result : inMemory ? result.blob : await handle.getFile();
  const expectedFrames = Math.ceil(
    Object.values(project.clips).reduce((max, c) => Math.max(max, c.start + c.duration), 0) *
      project.settings.fps,
  );
  return {
    seconds,
    inMemory,
    expectedFrames,
    progress: lastProgress,
    ...(await readBack(file)),
  };
}

/** Saves the project as a .cutline file (the Node side catches the download). */
export async function saveProject() {
  const m = await modules();
  await m.projectFiles.saveProjectFile();
}

/** Opens a .cutline file chosen through `input` and waits for its media to load. */
export async function openProject(selector, timeoutMs) {
  const m = await modules();
  const file = document.querySelector(selector).files[0];
  const started = performance.now();
  await m.projectFiles.openProjectFile(file);
  await assetsSettled(m, timeoutMs);
  return { seconds: (performance.now() - started) / 1000 };
}

export async function storage() {
  const { usage, quota } = await navigator.storage.estimate();
  return { usage, quota, persisted: await navigator.storage.persisted() };
}

export async function clearOutputs(names) {
  const root = await opfs();
  await Promise.all(names.map((n) => root.removeEntry(n).catch(() => {})));
}

/**
 * Exports' windowed mix against one whole-timeline render of the same
 * project, with fades and effects whose tails and modulation cross window
 * joins. Returns the largest sample difference, overall and at the joins.
 */
export async function mixCheck() {
  const m = await modules();
  const graph = await import("/src/engine/audio-graph.ts");
  const timeline = await import("/src/core/timeline.ts");
  const base = m.store.editorStore.getState().project;
  const clip = Object.values(base.clips).find((c) => c.type === "media");
  const effect = (effectId, params) => ({ id: effectId, effectId, enabled: true, params });
  const project = {
    ...base,
    clips: {
      ...base.clips,
      [clip.id]: {
        ...clip,
        fadeIn: 2,
        fadeOut: 3,
        audioEffects: [
          effect("pitch", { semitones: 3, mix: 0.5 }),
          effect("tremolo", { rate: 3.3, depth: 0.6 }),
          effect("echo", { time: 0.3, feedback: 0.35, mix: 0.3 }),
          effect("reverb", { decay: 2, preDelay: 0.02, mix: 0.3, tone: 6000 }),
        ],
      },
    },
  };
  const duration = timeline.projectDuration(project);
  const total = Math.ceil(duration * SAMPLE_RATE);

  const windowed = [new Float32Array(total), new Float32Array(total)];
  let at = 0;
  for await (const buffer of m.exporter.mixdown(project, m.engine.media, duration)) {
    for (let ch = 0; ch < 2; ch++) windowed[ch].set(buffer.getChannelData(ch), at);
    at += buffer.length;
  }

  const reader = m.engine.media.audioReader(clip.assetId);
  const slice = await reader.read(0, project.assets[clip.assetId].duration + 1);
  await reader.dispose();
  const ctx = new OfflineAudioContext({
    numberOfChannels: 2,
    length: total,
    sampleRate: SAMPLE_RATE,
  });
  graph.scheduleAudio(ctx, ctx.destination, project, { from: 0, when: 0 }, duration, () => slice);
  const whole = await ctx.startRendering();

  let maxDiff = 0;
  let joinDiff = 0;
  let peak = 0;
  for (let ch = 0; ch < 2; ch++) {
    const ref = whole.getChannelData(ch);
    for (let i = 0; i < total; i++) {
      const d = Math.abs(ref[i] - windowed[ch][i]);
      peak = Math.max(peak, Math.abs(ref[i]));
      maxDiff = Math.max(maxDiff, d);
      if (i % (10 * SAMPLE_RATE) < 64 || i % (10 * SAMPLE_RATE) > 10 * SAMPLE_RATE - 64)
        joinDiff = Math.max(joinDiff, d);
    }
  }
  return { samples: at, expected: total, peak, maxDiff, joinDiff };
}
