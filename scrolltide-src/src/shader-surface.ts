import vertSource from './shaders/quad.vert.glsl?raw';
import spectralSource from './shaders/spectral.glsl?raw';
import noiseSource from './shaders/noise.glsl?raw';

/** `noise` must come after `spectral`: `resolvable` uses PI. */
const CHUNKS: Record<string, string> = {
  spectral: spectralSource,
  noise: noiseSource,
};

/**
 * GLSL has no include mechanism, so shared chunks are substituted in before
 * compiling. The marker has to sit after `#version`, which must be the first
 * line in the file.
 */
export function composeShader(body: string): string {
  return body.replace(/#include "([a-z]+)"/g, (match, name: string) => {
    const chunk = CHUNKS[name];
    // Leaving the marker in would fail at GLSL compile with a confusing error
    // about `#include`, so name the actual problem here.
    if (!chunk) throw new Error(`Unknown shader chunk "${name}" in ${match}`);
    return chunk;
  });
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed:\n${log}`);
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');
  const vs = compile(gl, gl.VERTEX_SHADER, vert);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  // Shaders are reference-counted by the program; drop our handles either way.
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link failed:\n${log}`);
  }
  return program;
}

export interface FrameContext {
  /** Seconds since the animation started, excluding any paused time. */
  time: number;
  /** Drawing-buffer size in device pixels. */
  width: number;
  height: number;
}

/**
 * A transparent full-bleed fragment shader on a canvas.
 *
 * Draws one fullscreen triangle per frame with premultiplied-alpha blending, so
 * the canvas composites over ordinary DOM. Handles DPR, resize, reduced-motion
 * and the animation clock; subclasses only supply uniforms.
 */
export abstract class ShaderSurface {
  protected readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly locations = new Map<string, WebGLUniformLocation | null>();
  private readonly observer: ResizeObserver;
  private readonly reducedMotion: MediaQueryList;

  private frame = 0;
  private startTime = performance.now();
  /** Wall-clock is only sampled while running, so pausing does not skip ahead. */
  private elapsed = 0;
  private running = false;
  private disposed = false;

  constructor(
    readonly canvas: HTMLCanvasElement,
    fragSource: string,
    private readonly maxDpr = 2,
  ) {
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false, // shader edges are already analytically soft
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    this.program = link(gl, vertSource, composeShader(fragSource));

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);

    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion.addEventListener('change', this.onMotionPreference);
  }

  /**
   * Deferred so subclass fields are initialised before the first draw. Call at
   * the end of the subclass constructor.
   */
  protected begin() {
    this.resize();
    if (this.reducedMotion.matches) {
      this.render(0); // one static frame, never animated
    } else {
      this.start();
    }
  }

  /** Push this frame's uniforms. Called with the program already bound. */
  protected abstract setUniforms(ctx: FrameContext): void;

  /** Cached uniform location lookup. */
  protected uniform(name: string): WebGLUniformLocation | null {
    let loc = this.locations.get(name);
    if (loc === undefined) {
      loc = this.gl.getUniformLocation(this.program, name);
      this.locations.set(name, loc);
    }
    return loc;
  }

  private onMotionPreference = () => {
    if (this.reducedMotion.matches) {
      this.stop();
      this.render(this.elapsed);
    } else {
      this.start();
    }
  };

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const width = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    if (!this.running) this.render(this.elapsed);
  }

  private render(time: number) {
    const { gl } = this;
    const width = this.canvas.width;
    const height = this.canvas.height;

    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    gl.uniform2f(this.uniform('uResolution'), width, height);
    gl.uniform1f(this.uniform('uTime'), time);
    this.setUniforms({ time, width, height });

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private tick = () => {
    if (this.disposed) return;
    this.elapsed = (performance.now() - this.startTime) / 1000;
    this.render(this.elapsed);
    this.frame = requestAnimationFrame(this.tick);
  };

  /** Redraw with current options without resuming animation. */
  refresh() {
    if (!this.running) this.render(this.elapsed);
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    // Rebase the clock so a pause does not jump the animation forward.
    this.startTime = performance.now() - this.elapsed * 1000;
    this.frame = requestAnimationFrame(this.tick);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  dispose() {
    this.stop();
    this.disposed = true;
    this.observer.disconnect();
    this.reducedMotion.removeEventListener('change', this.onMotionPreference);
    this.gl.deleteProgram(this.program);
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
