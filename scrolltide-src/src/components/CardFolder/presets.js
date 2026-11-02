/**
 * Colour presets for <CardFolder />.
 *
 * `art` is used only when no `image` prop is passed — it is any valid CSS
 * background shorthand, so gradients, images or layered stacks all work.
 * `panel` is also a full CSS background, so the folder face can be a gradient.
 *
 * `sheen` is the iridescent conic sweep that gets blurred into glass. `blend`
 * and `sheenOpacity` tune how it sits on the artwork — light artwork needs
 * `overlay`, dark artwork `screen`.
 */
export const presets = {
  indigo: {
    frame: '#0a0a30',
    panel: 'linear-gradient(180deg, #1a1a6b 0%, #14144f 100%)',
    title: '#ffffff',
    description: 'rgba(255, 255, 255, 0.52)',
    arrow: '#ffffff',
    edge: 'rgba(255, 255, 255, 0.16)',
    art:
      'radial-gradient(130% 100% at 28% 4%, #8b7cff 0%, #5a44e6 34%, #3320b4 62%, #1b0f72 100%)',
    sheen:
      'conic-gradient(from 205deg at 38% 26%, #c9a3ff 0deg, #6ee7ff 70deg, #a78bfa 140deg, #ff9ad5 210deg, #7c5cff 285deg, #c9a3ff 360deg)',
    sheenBlend: 'overlay',
    sheenOpacity: 0.5,
  },

  porcelain: {
    frame: '#c2d1e3',
    panel: 'linear-gradient(180deg, #f2f4f7 0%, #e8eaee 100%)',
    title: '#0d0f14',
    description: '#6a7280',
    arrow: '#0d0f14',
    edge: 'rgba(255, 255, 255, 0.85)',
    art:
      'radial-gradient(120% 95% at 26% 0%, #ffab4d 0%, #f4442a 34%, #a01a5e 62%, #2f1d96 100%)',
    sheen:
      'conic-gradient(from 150deg at 60% 24%, #fff0c2 0deg, #ffb27a 70deg, #ff8fb8 140deg, #b9c8ff 215deg, #ffd9a3 290deg, #fff0c2 360deg)',
    sheenBlend: 'soft-light',
    sheenOpacity: 0.55,
  },

  onyx: {
    frame: '#07090b',
    panel: 'linear-gradient(180deg, #141d24 0%, #0d1418 100%)',
    title: '#ffffff',
    description: 'rgba(255, 255, 255, 0.55)',
    arrow: '#ffffff',
    edge: 'rgba(255, 255, 255, 0.14)',
    art:
      'radial-gradient(120% 95% at 52% 0%, #eaf3fb 0%, #a8c7e0 24%, #55809f 46%, #233e54 68%, #05090c 100%)',
    sheen:
      'conic-gradient(from 235deg at 44% 20%, #eaf6ff 0deg, #a8d4ff 80deg, #e8d9ff 155deg, #bfe8ff 230deg, #ffffff 300deg, #eaf6ff 360deg)',
    sheenBlend: 'overlay',
    sheenOpacity: 0.45,
  },
}

export default presets
