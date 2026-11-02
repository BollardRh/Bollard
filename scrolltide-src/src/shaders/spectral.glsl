// Shared spectral core. Injected into each fragment shader in place of
// `#include "spectral"` -- GLSL has no include mechanism of its own, so the
// substitution happens in shader-surface.ts before compiling.

const float TAU = 6.28318530718;
const float PI  = 3.14159265359;

// Path-difference change that advances the hue through one full cycle. It's the
// beat period between the ends of the visible band: 1/0.62 - 1/1.42 ~= 0.91, so
// one order is ~1/0.91. Expressing `d` in these units lets dispersion be stated
// as "spectral orders" rather than an arbitrary gain.
const float ORDER = 1.1;

// --- Spectral Zucconi 6 -----------------------------------------------------
// Alan Zucconi's least-squares fit of the CIE visible spectrum. Takes a
// normalised wavelength in [0,1] (violet -> red) and returns linear RGB.
// Much cheaper than a real CIE table and close enough to be indistinguishable
// once it's been integrated over and bloomed.
vec3 bump3y(vec3 x, vec3 yoffset) {
  return clamp((1.0 - x * x) - yoffset, 0.0, 1.0);
}

vec3 spectralZucconi6(float x) {
  const vec3 c1 = vec3(3.54585104, 2.93225262, 2.41593945);
  const vec3 x1 = vec3(0.69549072, 0.49228336, 0.27699880);
  const vec3 y1 = vec3(0.02312639, 0.15225084, 0.52607955);
  const vec3 c2 = vec3(3.90307140, 3.21182957, 3.96587128);
  const vec3 x2 = vec3(0.11748627, 0.86755042, 0.66077860);
  const vec3 y2 = vec3(0.84897130, 0.88445281, 0.73949448);
  return bump3y(c1 * (x - x1), y1) + bump3y(c2 * (x - x2), y2);
}

// --- Diffraction ------------------------------------------------------------
// Given an optical path difference `d`, integrate the interference term over the
// visible band. Where `d` is small every wavelength constructively interferes
// and you get white; as `d` grows the wavelengths fall out of step at different
// rates and split into repeating spectral orders. This integral is what
// separates the effect from a plain hue-rotation rainbow.
//
// Three things this has to get right, all of which produce a grey or silver
// ring when missed:
//
//  1. The white point. Summing spectralZucconi6 across the band does NOT give
//     neutral white -- the fit is red/green heavy, so a scalar divisor leaves a
//     yellow cast on every pixel. Accumulate the weights and normalise
//     per-channel so full constructive interference lands on true white.
//
//  2. The DC floor. `0.5 + 0.5*cos(...)` has a mean of 0.5, so half the signal
//     is unmodulated broadband light diluting the colour. Raising the term to a
//     power narrows the constructive peaks, which matches the physics too: a
//     grating with many grooves has sharp orders (the N-slit interference
//     function), not soft cosine lobes.
//
//  3. Energy conservation. Brightness and saturation are anti-correlated by
//     construction: at d = 0 every wavelength is in phase, so the pixel is both
//     maximally bright AND white, while a saturated pixel has most of its
//     wavelengths destructive and is therefore dim. Left alone, the bright parts
//     are exactly the white parts and the colour is too dark to see. A real
//     grating redistributes the light it takes from the destructive wavelengths
//     into the constructive ones; dividing by the mean interference restores
//     that, holding brightness flat and letting chroma carry the variation.
//
vec3 diffraction(float d, float sharpness) {
  const int SAMPLES = 32;
  vec3 col = vec3(0.0);
  vec3 white = vec3(0.0);
  float total = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    float f = (float(i) + 0.5) / float(SAMPLES);  // 0 = violet, 1 = red
    float lambda = mix(0.62, 1.42, f);            // relative to 550nm
    vec3 weight = spectralZucconi6(f);
    float interference = pow(0.5 + 0.5 * cos(TAU * d / lambda), sharpness);
    col += interference * weight;
    white += weight;
    total += interference;
  }
  float mean = total / float(SAMPLES);
  vec3 c = (col / max(white, vec3(1e-4))) / max(mean, 0.12);

  // The energy term is an unbounded gain -- where most wavelengths land
  // destructive the mean gets tiny and the boost runs into the tens. Anything
  // past 1.0 clips per channel, and clipped r/g/b all pin to 1.0 together, which
  // is white: the most saturated pixels blow out to the least saturated colour.
  // Compress against the peak channel, which scales all three equally and so
  // preserves hue while bounding the result. Blowing out is the hotspot's job.
  float peak = max(max(c.r, c.g), c.b);
  return c * (1.5 / (1.0 + peak));
}
