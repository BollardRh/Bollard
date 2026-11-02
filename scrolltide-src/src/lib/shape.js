/**
 * Shared geometry for the stepped-card silhouettes.
 *
 * Both the folder notch and the bookmark tab are the same move: a horizontal
 * edge that steps up or down via a rounded corner into the riser and an
 * inverted one out of it. Keeping it here means one place to fix the maths.
 */

export const round = (n) => Math.round(n * 100) / 100

/**
 * Path commands for a smooth S-step centred on `x`, from a horizontal edge at
 * `fromY` to one at `toY`. Emits the `H` that runs up to the step, so callers
 * just concatenate. Set `rtl` when the path is being traced right-to-left,
 * which mirrors both sweep flags.
 *
 * The two arcs share a tangent, so the step reads as one continuous curve
 * rather than two corners that happen to touch.
 */
export function step(x, fromY, toY, { rtl = false } = {}) {
  const delta = toY - fromY
  const r = Math.abs(delta) / 2
  if (!r) return `H${round(x)}`

  const dir = rtl ? -1 : 1
  const mid = fromY + delta / 2
  const down = delta > 0 ? 1 : 0
  const sweep1 = rtl ? 1 - down : down
  const sweep2 = rtl ? down : 1 - down
  const a = round(r)

  return (
    `H${round(x - dir * r)}` +
    `A${a} ${a} 0 0 ${sweep1} ${round(x)} ${round(mid)}` +
    `A${a} ${a} 0 0 ${sweep2} ${round(x + dir * r)} ${round(toY)}`
  )
}

/**
 * Wraps a path in an SVG data URI for use as a CSS `mask-image`, so the shape
 * can clip any background — gradient, image, whatever — not just a flat fill.
 * `preserveAspectRatio="none"` is safe because callers derive the viewBox from
 * the card's own aspect ratio.
 */
export function toMask(d, vbW, vbH) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${round(vbW)} ${round(vbH)}" ` +
    `preserveAspectRatio="none"><path d="${d}" fill="#000"/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/**
 * A damped spring sampled into a CSS `linear()` easing, so the bounce runs on
 * the compositor with no physics library and no JS per frame.
 *
 * `bounce` 0 is critically damped (no overshoot); 1 overshoots ~25%.
 */
export function springEasing(bounce = 0.75, steps = 40) {
  const zeta = Math.max(0.2, Math.min(1, 1 - 0.6 * bounce))
  const w0 = 6.2 / zeta /* settles by the end of the duration */
  const values = []

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    let x
    if (zeta >= 0.999) {
      x = 1 - (1 + w0 * t) * Math.exp(-w0 * t)
    } else {
      const wd = w0 * Math.sqrt(1 - zeta * zeta)
      x =
        1 -
        Math.exp(-zeta * w0 * t) *
          (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
    }
    values.push(Math.round(x * 1e4) / 1e4)
  }

  values[0] = 0
  values[values.length - 1] = 1
  return `linear(${values.join(', ')})`
}
