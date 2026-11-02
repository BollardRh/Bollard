// Shared noise chunk. Injected in place of `#include "noise"`.
//
// Hash-based value noise rather than a gradient/simplex implementation: it's a
// few instructions, has no lookup tables, and the warping it usually feeds hides
// the axis-aligned character that would otherwise give value noise away.

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);  // smoothstep interpolation
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float e = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, e, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 4; i++) {
    v += amp * vnoise(p);
    p *= 2.03;   // slightly off 2.0 so octaves don't align into a grid
    amp *= 0.5;
  }
  return v;
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// Fades a repeating angular feature out as it approaches the Nyquist limit.
// `cycles` is repeats per full turn, `r` the radius in pixels. Past ~PI radians
// of phase per pixel the detail stops resolving and turns into moire, which any
// downstream averaging then washes to grey.
float resolvable(float cycles, float r) {
  return 1.0 - smoothstep(1.0, PI, cycles / max(r, 1.0));
}
