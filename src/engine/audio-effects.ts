import type { EffectInstance, Params } from "../core/types";

/** A built effect: where to connect in and out, plus oscillators/modulators to schedule. */
interface Chain {
  input: AudioNode;
  output: AudioNode;
  scheduled: AudioScheduledSourceNode[];
}

/** When the clip's sound starts and stops, in context time. */
export interface ChainTiming {
  start: number;
  stop: number;
  /**
   * How far into the clip `start` is, in seconds. Modulators start at this
   * phase, so a clip sounds the same wherever playback or an export window
   * picks it up.
   */
  elapsed: number;
}

type Builder = (ctx: BaseAudioContext, params: Params, timing: ChainTiming) => Chain;

const num = (params: Params, key: string, fallback: number) => {
  const value = params[key];
  return typeof value === "number" ? value : fallback;
};

const dbToGain = (db: number) => 10 ** (db / 20);

function biquad(
  ctx: BaseAudioContext,
  type: BiquadFilterType,
  frequency: number,
  gain = 0,
  q = 0.707,
) {
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.gain.value = gain;
  filter.Q.value = q;
  return filter;
}

/** Wires nodes in series and returns the ends. */
function series(nodes: AudioNode[]): { input: AudioNode; output: AudioNode } {
  nodes.slice(1).forEach((node, i) => nodes[i]?.connect(node));
  const input = nodes[0];
  const output = nodes.at(-1);
  if (!input || !output) throw new Error("An audio chain needs at least one node");
  return { input, output };
}

/** Blends a wet path with the dry signal: `mix` 0 = dry only, 1 = wet only. */
function withMix(
  ctx: BaseAudioContext,
  wet: { input: AudioNode; output: AudioNode },
  mix: number,
): Chain {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const dry = ctx.createGain();
  const wetLevel = ctx.createGain();
  dry.gain.value = 1 - mix;
  wetLevel.gain.value = mix;
  input.connect(dry).connect(output);
  input.connect(wet.input);
  wet.output.connect(wetLevel).connect(output);
  return { input, output, scheduled: [] };
}

const plain = (chain: { input: AudioNode; output: AudioNode }): Chain => ({
  ...chain,
  scheduled: [],
});

const shaperCurves = new Map<number, Float32Array<ArrayBuffer>>();
/** Soft-clipping transfer curve; `drive` 0–1. */
function shaper(ctx: BaseAudioContext, drive: number) {
  const key = Math.round(drive * 100);
  let curve = shaperCurves.get(key);
  if (!curve) {
    const k = key * 4;
    curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) {
      const x = (i * 2) / curve.length - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    shaperCurves.set(key, curve);
  }
  const node = ctx.createWaveShaper();
  node.curve = curve;
  node.oversample = "2x";
  return node;
}

/**
 * Mulberry32: the same noise for every context, so a reverb rendered in
 * separate export windows (or live) is one continuous room.
 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A sine oscillator that starts `elapsed` seconds into its cycle. */
function sineFrom(ctx: BaseAudioContext, frequency: number, elapsed: number): OscillatorNode {
  const phase = 2 * Math.PI * ((frequency * elapsed) % 1);
  const oscillator = ctx.createOscillator();
  oscillator.frequency.value = frequency;
  oscillator.setPeriodicWave(
    ctx.createPeriodicWave([0, Math.sin(phase)], [0, Math.cos(phase)], {
      disableNormalization: true,
    }),
  );
  return oscillator;
}

const impulses = new WeakMap<BaseAudioContext, Map<number, AudioBuffer>>();
/** Exponentially decaying stereo noise: a small, convincing room. */
function impulse(ctx: BaseAudioContext, decay: number): AudioBuffer {
  const perContext = impulses.get(ctx) ?? new Map<number, AudioBuffer>();
  impulses.set(ctx, perContext);
  const key = Math.round(decay * 10) / 10;
  const cached = perContext.get(key);
  if (cached) return cached;
  const length = Math.max(1, Math.floor(ctx.sampleRate * key));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    const random = seededRandom(key * 1000 + ch);
    for (let i = 0; i < length; i++) data[i] = (random() * 2 - 1) * (1 - i / length) ** 2.5;
  }
  perContext.set(key, buffer);
  return buffer;
}

/** A looping control signal (ramp or window) used to modulate an AudioParam. */
function loopingSignal(ctx: BaseAudioContext, period: number, shape: (phase: number) => number) {
  const length = Math.max(2, Math.floor(ctx.sampleRate * period));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = shape(i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

/**
 * Pitch shift without changing speed: two delay lines whose delay sweeps
 * linearly (a moving read head), crossfaded half a period apart so the
 * jumps when each sweep resets are never heard.
 */
const pitchShift: Builder = (ctx, params, timing) => {
  const ratio = 2 ** (num(params, "semitones", 0) / 12);
  const period = 0.1;
  const depth = Math.abs(ratio - 1) * period;
  const rising = ratio > 1;
  const input = ctx.createGain();
  const wet = ctx.createGain();
  const scheduled: AudioScheduledSourceNode[] = [];
  [0, 0.5].forEach((phaseOffset) => {
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0;
    const sweep = loopingSignal(ctx, period, (phase) => (rising ? 1 - phase : phase));
    const sweepDepth = ctx.createGain();
    sweepDepth.gain.value = depth;
    sweep.connect(sweepDepth).connect(delay.delayTime);
    const window = loopingSignal(ctx, period, (phase) => Math.sin(Math.PI * phase) ** 2);
    const fader = ctx.createGain();
    fader.gain.value = 0;
    window.connect(fader.gain);
    input.connect(delay).connect(fader).connect(wet);
    for (const node of [sweep, window]) {
      node.start(timing.start, ((phaseOffset + timing.elapsed / period) % 1) * period);
      scheduled.push(node);
    }
  });
  const chain = withMix(ctx, { input, output: wet }, num(params, "mix", 1));
  return { ...chain, scheduled };
};

/** Effect id → node graph. Parameters mirror `AUDIO_EFFECTS` in core. */
const BUILDERS: Record<string, Builder> = {
  gain: (ctx, p) => {
    const gain = ctx.createGain();
    gain.gain.value = dbToGain(num(p, "gain", 0));
    return plain(series([gain]));
  },
  pan: (ctx, p) => {
    const panner = ctx.createStereoPanner();
    panner.pan.value = num(p, "pan", 0);
    return plain(series([panner]));
  },
  eq: (ctx, p) =>
    plain(
      series([
        biquad(ctx, "highpass", num(p, "lowCut", 20)),
        biquad(ctx, "lowshelf", 120, num(p, "low", 0)),
        biquad(ctx, "peaking", num(p, "midFrequency", 1000), num(p, "mid", 0), 1),
        biquad(ctx, "highshelf", 8000, num(p, "high", 0)),
      ]),
    ),
  "voice-enhance": (ctx, p) => {
    const amount = num(p, "amount", 0.7);
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18 - 8 * amount;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.15;
    const makeup = ctx.createGain();
    makeup.gain.value = dbToGain(4 * amount);
    return plain(
      series([
        biquad(ctx, "highpass", 80),
        biquad(ctx, "peaking", 300, -4 * amount, 1),
        biquad(ctx, "peaking", 3000, 4 * amount, 0.8),
        biquad(ctx, "highshelf", 10000, 2 * amount),
        compressor,
        makeup,
      ]),
    );
  },
  compressor: (ctx, p) => {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = num(p, "threshold", -24);
    compressor.ratio.value = num(p, "ratio", 4);
    compressor.attack.value = num(p, "attack", 0.01);
    compressor.release.value = num(p, "release", 0.2);
    const makeup = ctx.createGain();
    makeup.gain.value = dbToGain(num(p, "makeup", 4));
    return plain(series([compressor, makeup]));
  },
  reverb: (ctx, p) => {
    const preDelay = ctx.createDelay(1);
    preDelay.delayTime.value = num(p, "preDelay", 0.02);
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse(ctx, num(p, "decay", 2));
    return withMix(
      ctx,
      series([preDelay, convolver, biquad(ctx, "lowpass", num(p, "tone", 6000))]),
      num(p, "mix", 0.25),
    );
  },
  echo: (ctx, p) => {
    const delay = ctx.createDelay(2);
    delay.delayTime.value = num(p, "time", 0.3);
    const feedback = ctx.createGain();
    feedback.gain.value = Math.min(0.95, num(p, "feedback", 0.35));
    delay.connect(feedback).connect(delay);
    return withMix(ctx, { input: delay, output: delay }, num(p, "mix", 0.3));
  },
  "bass-boost": (ctx, p) =>
    plain(series([biquad(ctx, "lowshelf", num(p, "frequency", 100), num(p, "amount", 8))])),
  telephone: (ctx, p) =>
    withMix(
      ctx,
      series([
        biquad(ctx, "highpass", 300, 0, 0.9),
        biquad(ctx, "lowpass", 3400, 0, 0.9),
        biquad(ctx, "peaking", 1200, 6, 1),
        shaper(ctx, num(p, "crunch", 0.3) * 0.6),
      ]),
      num(p, "amount", 1),
    ),
  megaphone: (ctx, p) =>
    withMix(
      ctx,
      series([
        biquad(ctx, "highpass", 500, 0, 1.2),
        biquad(ctx, "lowpass", 3000, 0, 1.2),
        biquad(ctx, "peaking", 1500, 8, 1.4),
        shaper(ctx, 0.3 + num(p, "drive", 0.6) * 0.7),
      ]),
      num(p, "amount", 1),
    ),
  muffled: (ctx, p) =>
    withMix(
      ctx,
      series([biquad(ctx, "lowpass", num(p, "cutoff", 600), 0, 0.7)]),
      num(p, "amount", 1),
    ),
  distortion: (ctx, p) =>
    withMix(
      ctx,
      series([shaper(ctx, num(p, "drive", 0.4)), biquad(ctx, "lowpass", num(p, "tone", 4000))]),
      num(p, "mix", 0.6),
    ),
  filter: (ctx, p) => {
    const types: BiquadFilterType[] = ["lowpass", "highpass", "bandpass"];
    const type = types[Math.round(num(p, "mode", 0))] ?? "lowpass";
    return plain(series([biquad(ctx, type, num(p, "frequency", 1200), 0, num(p, "resonance", 1))]));
  },
  tremolo: (ctx, p, timing) => {
    const depth = num(p, "depth", 0.5);
    const amp = ctx.createGain();
    amp.gain.value = 1 - depth / 2;
    const lfo = sineFrom(ctx, num(p, "rate", 6), timing.elapsed);
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = depth / 2;
    lfo.connect(lfoDepth).connect(amp.gain);
    lfo.start(timing.start);
    return { input: amp, output: amp, scheduled: [lfo] };
  },
  robot: (ctx, p, timing) => {
    const ring = ctx.createGain();
    ring.gain.value = 0;
    const carrier = sineFrom(ctx, num(p, "frequency", 50), timing.elapsed);
    carrier.connect(ring.gain);
    carrier.start(timing.start);
    const chain = withMix(ctx, { input: ring, output: ring }, num(p, "mix", 0.8));
    return { ...chain, scheduled: [carrier] };
  },
  pitch: pitchShift,
};

/**
 * Builds a clip's audio effect stack in order. Unknown or disabled entries
 * are skipped; scheduled modulators must be stopped with the clip.
 */
export function buildAudioChain(
  ctx: BaseAudioContext,
  effects: readonly EffectInstance[],
  timing: ChainTiming,
): Chain | null {
  const chains = effects.flatMap((e) => {
    const build = e.enabled ? BUILDERS[e.effectId] : undefined;
    return build ? [build(ctx, e.params, timing)] : [];
  });
  const first = chains[0];
  const last = chains.at(-1);
  if (!first || !last) return null;
  chains.slice(1).forEach((chain, i) => chains[i]?.output.connect(chain.input));
  return { input: first.input, output: last.output, scheduled: chains.flatMap((c) => c.scheduled) };
}

/** Ids the engine can build — kept in step with the core catalog by a test. */
export const BUILT_AUDIO_EFFECTS = Object.keys(BUILDERS);
