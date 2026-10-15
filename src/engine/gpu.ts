import { decodeLut } from "../core/lut";
import type { EffectDefinition, ParamValue, Params } from "../core/types";
import type { Drawable } from "./compositor";

/** One shader invocation: a definition with its parameter values and clocks. */
export interface GpuPass {
  definition: EffectDefinition;
  params: Params;
  progress: number;
  time: number;
  /** Logical (project) resolution, so pixel-sized parameters match preview and export. */
  resolution: readonly [number, number];
}

export interface ShaderError {
  line: number | null;
  message: string;
}

export class ShaderCompileError extends Error {
  readonly errors: ShaderError[];
  constructor(name: string, errors: ShaderError[]) {
    super(
      `${name}: ${errors.map((e) => (e.line ? `line ${e.line}: ${e.message}` : e.message)).join("; ")}`,
    );
    this.errors = errors;
  }
}

const VERTEX = `#version 300 es
in vec2 position;
out vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

/** Compiled programs kept per GPU context; editing a shader produces a new one per version. */
const PROGRAM_CACHE_LIMIT = 96;

const RESERVED_DECLARATION = /^\s*uniform\s+\w+\s+(progress|ratio|time|resolution)\s*;.*$/gm;

/** The host-side contract every effect and transition source is compiled into. */
function fragmentSource(def: EffectDefinition): string {
  const entry = def.kind === "transition" ? "transition" : "effect";
  // Keep the user's line numbers: reserved declarations become blank lines.
  const body = def.source.replace(RESERVED_DECLARATION, "");
  return `#version 300 es
precision highp float;
precision highp int;
precision highp sampler3D;
in vec2 vUv;
out vec4 cutlineColor;
uniform sampler2D cutlineFrom;
uniform sampler2D cutlineTo;
uniform sampler3D cutlineLut;
uniform float cutlineLutSize;
uniform float progress;
uniform float time;
uniform float ratio;
uniform vec2 resolution;
#define texture2D texture
vec4 getColor(vec2 uv) { return texture(cutlineFrom, uv); }
vec4 getFromColor(vec2 uv) { return texture(cutlineFrom, uv); }
vec4 getToColor(vec2 uv) { return texture(cutlineTo, uv); }
vec3 applyLut(vec3 c) {
  float n = cutlineLutSize;
  return texture(cutlineLut, clamp(c, 0.0, 1.0) * ((n - 1.0) / n) + 0.5 / n).rgb;
}
#line 1
${body}
void main() { cutlineColor = clamp(${entry}(vUv), 0.0, 1.0); }`;
}

/** Turns `ERROR: 0:12: 'foo' : undeclared identifier` lines into structured errors. */
function parseLog(log: string): ShaderError[] {
  const errors = log
    .replaceAll("\0", "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(?:ERROR|WARNING):\s*\d+:(\d+):\s*(.*)$/.exec(line);
      return match
        ? { line: Number(match[1]), message: match[2] ?? line }
        : { line: null, message: line };
    });
  return errors.length ? errors : [{ line: null, message: "Unknown shader error" }];
}

interface Program {
  program: WebGLProgram;
  uniforms: Map<string, { location: WebGLUniformLocation; type: number }>;
  lut: WebGLTexture | null;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * Runs effect chains and transitions with WebGL2 on its own OffscreenCanvas.
 * The result canvas is reused by the next call, so callers draw it right away.
 */
export class GpuEffects {
  private readonly canvas = new OffscreenCanvas(1, 1);
  private readonly gl: WebGL2RenderingContext;
  private readonly programs = new Map<string, Program | ShaderCompileError>();
  private readonly inputs: [WebGLTexture, WebGLTexture];
  private readonly targets: { texture: WebGLTexture; framebuffer: WebGLFramebuffer }[] = [];
  private readonly onError: (error: Error) => void;

  constructor(onError: (error: Error) => void) {
    this.onError = onError;
    const gl = this.canvas.getContext("webgl2", {
      premultipliedAlpha: false,
      alpha: true,
      antialias: false,
    });
    if (!gl) throw new Error("WebGL2 is not available; effects need a WebGL2-capable browser");
    this.gl = gl;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.inputs = [this.texture(), this.texture()];
  }

  private texture(): WebGLTexture {
    const { gl } = this;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  private compile(def: EffectDefinition): Program {
    const { gl } = this;
    const shader = (type: number, source: string) => {
      const s = gl.createShader(type);
      if (!s) throw new Error("Could not create a shader");
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s) ?? "";
        gl.deleteShader(s);
        throw new ShaderCompileError(def.name, parseLog(log));
      }
      return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource(def)));
    gl.bindAttribLocation(program, 0, "position");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new ShaderCompileError(def.name, parseLog(gl.getProgramInfoLog(program) ?? ""));
    }
    const uniforms = new Map<string, { location: WebGLUniformLocation; type: number }>();
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      const location = info && gl.getUniformLocation(program, info.name);
      if (info && location) uniforms.set(info.name, { location, type: info.type });
    }
    return { program, uniforms, lut: def.lut ? this.lutTexture(def.lut) : null };
  }

  private lutTexture(lut: { size: number; data: string }): WebGLTexture {
    const { gl } = this;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.RGB8,
      lut.size,
      lut.size,
      lut.size,
      0,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      decodeLut(lut.data),
    );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    for (const wrap of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) {
      gl.texParameteri(gl.TEXTURE_3D, wrap, gl.CLAMP_TO_EDGE);
    }
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
  }

  /** Compiles (and caches) a definition's program; throws ShaderCompileError on failure. */
  validate(def: EffectDefinition) {
    const key = `${def.id}\n${def.source}`;
    const cached = this.programs.get(key);
    if (cached instanceof ShaderCompileError) throw cached;
    if (cached) return cached;
    try {
      const program = this.compile(def);
      this.remember(key, program);
      return program;
    } catch (error) {
      if (error instanceof ShaderCompileError) this.remember(key, error);
      throw error;
    }
  }

  /** Caches a compile result, evicting (and freeing) the oldest beyond the limit. */
  private remember(key: string, result: Program | ShaderCompileError) {
    this.programs.set(key, result);
    for (const [oldKey, old] of this.programs) {
      if (this.programs.size <= PROGRAM_CACHE_LIMIT) break;
      if (!(old instanceof ShaderCompileError)) {
        this.gl.deleteProgram(old.program);
        if (old.lut) this.gl.deleteTexture(old.lut);
      }
      this.programs.delete(oldKey);
    }
  }

  /** A compiled program, or null (reported once) when the shader is broken. */
  private program(def: EffectDefinition): Program | null {
    const key = `${def.id}\n${def.source}`;
    const known = this.programs.has(key);
    try {
      return this.validate(def);
    } catch (error) {
      if (!known) this.onError(error as Error);
      return null;
    }
  }

  private resize(width: number, height: number) {
    const { gl, canvas } = this;
    if (canvas.width === width && canvas.height === height && this.targets.length) return;
    canvas.width = width;
    canvas.height = height;
    for (const target of this.targets) {
      gl.deleteTexture(target.texture);
      gl.deleteFramebuffer(target.framebuffer);
    }
    this.targets.length = 0;
    for (let i = 0; i < 2; i++) {
      const texture = this.texture();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      this.targets.push({ texture, framebuffer });
    }
  }

  private upload(slot: 0 | 1, image: Drawable) {
    const { gl } = this;
    gl.activeTexture(gl.TEXTURE0 + slot);
    gl.bindTexture(gl.TEXTURE_2D, this.inputs[slot]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  }

  private setParam(program: Program, key: string, value: ParamValue) {
    const { gl } = this;
    const uniform = program.uniforms.get(key);
    if (!uniform) return;
    const { location, type } = uniform;
    const color = typeof value === "string" ? hexToRgb(value) : null;
    const pair = Array.isArray(value) ? (value as readonly [number, number]) : null;
    const scalar =
      typeof value === "boolean" ? Number(value) : typeof value === "number" ? value : 0;
    const setters: Record<number, () => void> = {
      [gl.FLOAT]: () => gl.uniform1f(location, scalar),
      [gl.INT]: () => gl.uniform1i(location, Math.round(scalar)),
      [gl.BOOL]: () => gl.uniform1i(location, scalar ? 1 : 0),
      [gl.FLOAT_VEC2]: () => gl.uniform2f(location, pair?.[0] ?? 0, pair?.[1] ?? 0),
      [gl.INT_VEC2]: () =>
        gl.uniform2i(location, Math.round(pair?.[0] ?? 0), Math.round(pair?.[1] ?? 0)),
      [gl.FLOAT_VEC3]: () => gl.uniform3f(location, ...(color ?? [0, 0, 0])),
      [gl.FLOAT_VEC4]: () => gl.uniform4f(location, ...(color ?? [0, 0, 0]), 1),
    };
    setters[type]?.();
  }

  private draw(program: Program, pass: GpuPass, framebuffer: WebGLFramebuffer | null) {
    const { gl, canvas } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program.program);
    const set1f = (name: string, value: number) => {
      const u = program.uniforms.get(name);
      if (u) gl.uniform1f(u.location, value);
    };
    const set1i = (name: string, value: number) => {
      const u = program.uniforms.get(name);
      if (u) gl.uniform1i(u.location, value);
    };
    set1i("cutlineFrom", 0);
    set1i("cutlineTo", 1);
    set1f("progress", pass.progress);
    set1f("time", pass.time);
    set1f("ratio", pass.resolution[0] / pass.resolution[1]);
    const resolution = program.uniforms.get("resolution");
    if (resolution) gl.uniform2f(resolution.location, pass.resolution[0], pass.resolution[1]);
    // The 3D sampler always gets its own unit so it never aliases a 2D one.
    set1i("cutlineLut", 2);
    if (program.lut && pass.definition.lut) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_3D, program.lut);
      set1f("cutlineLutSize", pass.definition.lut.size);
    }
    for (const param of pass.definition.params) {
      this.setParam(program, param.key, pass.params[param.key] ?? param.default);
    }
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Runs `passes` in order over `image`; returns a canvas holding the result. */
  apply(image: Drawable, passes: readonly GpuPass[]): Drawable {
    const runnable = passes.flatMap((pass) => {
      const program = this.program(pass.definition);
      return program ? [{ pass, program }] : [];
    });
    if (runnable.length === 0) return image;
    const { gl } = this;
    this.resize(image.width, image.height);
    this.upload(0, image);
    runnable.forEach(({ pass, program }, i) => {
      const last = i === runnable.length - 1;
      const target = this.targets[i % 2];
      this.draw(program, pass, last ? null : (target?.framebuffer ?? null));
      if (!last && target) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, target.texture);
      }
    });
    return this.canvas;
  }

  /** Blends `from` into `to` with a transition pass. */
  transition(from: Drawable, to: Drawable, pass: GpuPass): Drawable {
    const program = this.program(pass.definition);
    if (!program) return pass.progress < 0.5 ? from : to;
    this.resize(from.width, from.height);
    this.upload(1, to);
    this.upload(0, from);
    this.draw(program, pass, null);
    return this.canvas;
  }
}

/** A GPU pipeline, or null (reported once) when the browser lacks WebGL2. */
export function createGpu(onError: (error: Error) => void): GpuEffects | null {
  try {
    return new GpuEffects(onError);
  } catch (error) {
    onError(error as Error);
    return null;
  }
}
