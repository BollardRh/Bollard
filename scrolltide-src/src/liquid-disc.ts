import fragSource from './shaders/liquid.frag.glsl?raw';
import { ShaderSurface, type FrameContext } from './shader-surface';

export interface LiquidDiscOptions {
  /**
   * Field algorithm. Fixed to 2 (Caustic — interfering circular wavefronts,
   * a pool-floor-light look) for this component. The upstream source this is
   * adapted from exposes eight interchangeable modes (Warp, Swirl, Caustic,
   * Marble, Ridge, Cells, Sweep, Ripple) behind a dev-only switcher; only the
   * shader code for the mode this product ships needs to be understood here,
   * though all eight are compiled in since they live in the same shader file.
   */
  mode: number;
  /** Disc radius, as a fraction of the nominal element's smaller side. */
  radius: number;
  /** Flow rate. 0 freezes the field. */
  speed: number;
  /** Field features per disc radius. Higher = busier, smaller structures. */
  scale: number;
  /** Field character. What it controls depends on the mode — for Caustic
   *  specifically, this scales how far the interference sources orbit. */
  warp: number;
  /** Spectral orders across the field's range. */
  dispersion: number;
  /** Order narrowness, effectively the saturation control. */
  sharpness: number;
  /** Specular tightness on the folds. */
  hotspot: number;
  /** Outward bleed past the disc edge, in radii. */
  glow: number;
  /** Overall brightness gain. */
  intensity: number;
  /**
   * How much bigger the canvas is than the element the disc is sized against,
   * so the glow has room to fall off instead of being clipped into a visible
   * rectangle. Must match the CSS: the canvas is 150% of its container.
   */
  overscan: number;
  /** Cap on devicePixelRatio. 2 is plenty; 3 costs a lot for no visible gain. */
  maxDpr: number;
}

// The exact "Caustic arcs" tuned configuration this component ships with —
// measured against the reference clip, not eyeballed. mode is pinned to 2
// (Caustic) and never exposed for switching; see the note on the interface.
export const defaultOptions: LiquidDiscOptions = {
  mode: 2,
  radius: 0.4,
  speed: 0.7,
  scale: 0.5,
  // Warp off, so the interference sources orbit at a fixed radius rather than
  // drifting further out — closer to the measured reference than the wider
  // "Molten"/"Vortex" looks this same shader can also produce.
  warp: 0.0,
  // ~1 spectral order, close to the measured reference.
  dispersion: 1.1,
  sharpness: 2.9,
  hotspot: 9,
  glow: 0.02,
  intensity: 1.35,
  overscan: 1.5,
  maxDpr: 2,
};

/**
 * A disc of flowing spectral liquid, sitting behind an opaque cap so only its
 * outer margin shows as a ring.
 *
 * Unlike a ring driven by a light orbiting a thin band, colour here comes from
 * a full 2D field, so the visible band varies along its length and across its
 * width simultaneously and keeps evolving instead of rotating rigidly.
 */
export class LiquidDisc extends ShaderSurface {
  options: LiquidDiscOptions;

  constructor(canvas: HTMLCanvasElement, options: Partial<LiquidDiscOptions> = {}) {
    const merged = { ...defaultOptions, ...options };
    super(canvas, fragSource, merged.maxDpr);
    this.options = merged;
    this.begin();
  }

  protected setUniforms({ width, height }: FrameContext) {
    const { gl, options } = this;
    const unit = Math.min(width, height) / options.overscan;

    gl.uniform1f(this.uniform('uRadius'), options.radius * unit);
    gl.uniform1f(this.uniform('uSpeed'), options.speed);
    gl.uniform1f(this.uniform('uScale'), options.scale);
    gl.uniform1f(this.uniform('uWarp'), options.warp);
    gl.uniform1f(this.uniform('uDispersion'), options.dispersion);
    gl.uniform1f(this.uniform('uSharpness'), options.sharpness);
    gl.uniform1f(this.uniform('uHotspot'), options.hotspot);
    gl.uniform1f(this.uniform('uGlow'), options.glow);
    gl.uniform1f(this.uniform('uIntensity'), options.intensity);
    gl.uniform1i(this.uniform('uMode'), options.mode | 0);
  }
}
