#version 300 es
precision highp float;
#include "spectral"
#include "noise"

// A full disc of flowing spectral liquid. Same diffraction integral as a
// grating ring, but the optical path difference comes from a scalar field
// flowing across the whole circle instead of from a light orbiting a thin band.
//
// The visible result is meant to be an annulus: a smaller opaque cap sits on top
// in the DOM, so only the outer margin of this disc shows. That's the point of
// the approach -- the ring is a *window onto a 2D field* rather than a 1D
// function of angle, so colour varies along the band and across it at once, and
// the pattern keeps evolving instead of rotating rigidly.
//
// uMode selects which field drives it. They're deliberately different in
// character rather than variations on one idea, since the whole point is to see
// which structure reads closest to the reference. This build pins uMode to
// MODE_CAUSTIC (see liquid-disc.ts) but all eight remain compiled in below,
// unmodified, since they live in the same shader file upstream.

uniform vec2  uResolution;
uniform float uTime;
uniform float uRadius;      // disc radius, px
uniform float uSpeed;       // flow rate
uniform float uScale;       // field features per disc radius
uniform float uWarp;        // field character -- meaning depends on the mode
uniform float uDispersion;  // spectral orders across the field's range
uniform float uSharpness;
uniform float uHotspot;
uniform float uGlow;        // outward bleed beyond the disc edge, in radii
uniform float uIntensity;
uniform int   uMode;

out vec4 fragColor;

const int MODE_WARP    = 0;
const int MODE_SWIRL   = 1;
const int MODE_CAUSTIC = 2;
const int MODE_MARBLE  = 3;
const int MODE_RIDGE   = 4;
const int MODE_CELLS   = 5;
const int MODE_SWEEP   = 6;
const int MODE_RIPPLE  = 7;

// --- fields -----------------------------------------------------------------
// Each returns roughly 0..1. main() recentres and scales that into orders.

// Noise displacing a lookup into more noise. Two rounds is what turns smooth
// blobs into folded, marbled structure. Each layer drifts on its own vector so
// nothing pulses in lockstep.
float fieldWarp(vec2 q, float t, float warp) {
  vec2 w1 = vec2(fbm(q + vec2(0.0, t * 0.35)),
                 fbm(q + vec2(5.2, 1.3) - vec2(t * 0.28, 0.0)));
  vec2 w2 = vec2(fbm(q + warp * w1 + vec2(1.7, 9.2) + vec2(0.0, t * 0.22)),
                 fbm(q + warp * w1 + vec2(8.3, 2.8) - vec2(t * 0.19, 0.0)));
  return fbm(q + warp * w2);
}

// Rotation that increases with radius, so the field shears into a vortex. The
// twist winds up over time rather than just spinning.
float fieldSwirl(vec2 q, float t, float warp) {
  float twist = length(q) * warp * 1.6 - t * 0.5;
  return fbm(rot(twist) * q + vec2(0.0, t * 0.12));
}

// Interfering circular wavefronts from a handful of drifting sources -- the
// pool-floor caustic look. Sharp, high-contrast, lots of fine structure.
float fieldCaustic(vec2 q, float t, float warp) {
  float v = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 src = vec2(cos(t * 0.31 + fi * 2.4), sin(t * 0.37 + fi * 1.7)) * (1.2 + warp * 0.4);
    v += sin(length(q - src) * (3.0 + fi * 0.8) - t * 1.3);
  }
  return v / 10.0 + 0.5;
}

// Classic marbling: a smooth ramp whose phase is pushed around by noise. Gives
// long continuous veins rather than blobs.
float fieldMarble(vec2 q, float t, float warp) {
  float n = fbm(q * 0.9 + vec2(0.0, t * 0.15));
  return 0.5 + 0.5 * sin(q.x * 1.8 + q.y * 1.1 + n * warp * 4.0 + t * 0.6);
}

// Ridged multifractal: folding the noise about its midpoint turns smooth hills
// into creases, which gives filament-like highlights.
float fieldRidge(vec2 q, float t, float warp) {
  float v = 0.0, amp = 0.5;
  vec2 p = q + vec2(t * 0.09, -t * 0.06);
  for (int i = 0; i < 4; i++) {
    float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
    v += amp * pow(n, 1.0 + warp);
    p *= 2.03;
    amp *= 0.5;
  }
  return v;
}

// Voronoi F1: cellular structure with hard-edged boundaries, each cell centre
// orbiting its own little circle.
float fieldCells(vec2 q, float t, float warp) {
  vec2 n = floor(q), f = fract(q);
  float best = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = vec2(hash21(n + g), hash21(n + g + 31.7));
      o = 0.5 + 0.5 * sin(t * 0.8 + TAU * o) * clamp(warp, 0.0, 1.0);
      best = min(best, length(g + o - f));
    }
  }
  return clamp(best, 0.0, 1.0);
}

// A conic sweep, like a diffraction-grating ring but perturbed by noise so it
// wobbles and drifts instead of rotating rigidly. Closest of the modes to a
// plain angular sweep.
float fieldSweep(vec2 q, float t, float warp) {
  float a = atan(q.y, q.x);
  return 0.5 + 0.5 * cos(a - t * 0.8 + (fbm(q * 0.8 + vec2(0.0, t * 0.1)) - 0.5) * warp * 5.0);
}

// Concentric wavefronts from a single wandering source, softened by noise.
float fieldRipple(vec2 q, float t, float warp) {
  vec2 c = vec2(cos(t * 0.4), sin(t * 0.53)) * 0.7;
  float rr = length(q - c);
  return 0.5 + 0.5 * sin(rr * (2.0 + warp * 2.5) - t * 1.5 + (fbm(q) - 0.5) * 2.0);
}

float field(vec2 q, float t, float warp) {
  if (uMode == MODE_SWIRL)   return fieldSwirl(q, t, warp);
  if (uMode == MODE_CAUSTIC) return fieldCaustic(q, t, warp);
  if (uMode == MODE_MARBLE)  return fieldMarble(q, t, warp);
  if (uMode == MODE_RIDGE)   return fieldRidge(q, t, warp);
  if (uMode == MODE_CELLS)   return fieldCells(q, t, warp);
  if (uMode == MODE_SWEEP)   return fieldSweep(q, t, warp);
  if (uMode == MODE_RIPPLE)  return fieldRipple(q, t, warp);
  return fieldWarp(q, t, warp);
}

void main() {
  vec2 p = gl_FragCoord.xy - 0.5 * uResolution;
  float r = length(p);
  float rn = r / uRadius;              // 1.0 at the disc edge

  vec2 q = p / uRadius * uScale;
  float t = uTime * uSpeed;

  // Three field evaluations: the value plus a forward difference for the
  // gradient. Central differences would cost two more for no visible gain, and
  // the expensive modes (caustic, cells) are evaluated per sample.
  float eps = 0.04;
  float f0 = field(q, t, uWarp);
  float fx = field(q + vec2(eps, 0.0), t, uWarp);
  float fy = field(q + vec2(0.0, eps), t, uWarp);

  // Recentre so the disc doesn't sit permanently on one side of the spectrum,
  // then scale into orders.
  float d = ORDER * uDispersion * (f0 - 0.5) * 2.0 + 0.55;
  vec3 spec = diffraction(d, uSharpness);

  // The gradient stands in for a surface normal: ridges catch the light the way
  // a raised fold would.
  vec2 grad = vec2(fx - f0, fy - f0) / eps;
  vec2 lightDir = vec2(cos(t * 0.6), sin(t * 0.6));
  float ndl = clamp(dot(normalize(grad + 1e-5), lightDir) * length(grad) * 1.4, -1.0, 1.0);
  float hot = pow(max(ndl, 0.0), uHotspot);

  vec3 col = spec * (0.75 + 0.5 * max(ndl, 0.0)) + vec3(hot) * 0.9;
  col *= uIntensity;

  // Disc mask, antialiased against roughly one device pixel, plus a soft bleed
  // outside the edge so the disc glows onto its surroundings rather than
  // ending flat.
  float aa = 1.5 / uRadius;
  float disc = 1.0 - smoothstep(1.0 - aa, 1.0, rn);
  float bleed = exp(-max(rn - 1.0, 0.0) / max(uGlow, 1e-3));
  float shape = max(disc, bleed * 0.55);

  vec3 outCol = col * shape;
  float alpha = clamp(shape, 0.0, 1.0);

  // Ramp to true zero before the canvas ends, or the bleed clips into a visible
  // rectangle against the background.
  float edge = 1.0 - smoothstep(0.78, 1.0, r / (0.5 * min(uResolution.x, uResolution.y)));
  outCol *= edge;
  alpha *= edge;

  fragColor = vec4(outCol, alpha);
}
