/**
 * Colour presets for <ExpandedCards />.
 *
 * A card is a photograph with type laid over it, so a preset is mostly the
 * scrims: `dim` is the veil that holds a collapsed card back, `scrim` is the
 * bottom gradient that keeps the caption legible once the card opens. Both
 * sit above the image, so they carry the mood far more than `background`
 * does — that only shows through in the gaps.
 */
export const presets = {
  void: {
    background: '#000000',
    dim: 'linear-gradient(180deg, rgba(3, 5, 10, 0.58) 0%, rgba(3, 5, 10, 0.72) 100%)',
    scrim: 'linear-gradient(180deg, rgba(4, 6, 12, 0) 34%, rgba(4, 6, 12, 0.58) 68%, rgba(4, 6, 12, 0.9) 100%)',
    title: '#ffffff',
    body: 'rgba(255, 255, 255, 0.86)',
    number: '#ffffff',
    numberDim: 'rgba(255, 255, 255, 0.72)',
    icon: 'rgba(255, 255, 255, 0.92)',
  },

  slate: {
    background: '#0e1117',
    dim: 'linear-gradient(180deg, rgba(10, 14, 22, 0.5) 0%, rgba(10, 14, 22, 0.68) 100%)',
    scrim: 'linear-gradient(180deg, rgba(8, 11, 18, 0) 34%, rgba(8, 11, 18, 0.56) 68%, rgba(8, 11, 18, 0.88) 100%)',
    title: '#ffffff',
    body: 'rgba(255, 255, 255, 0.82)',
    number: '#ffffff',
    numberDim: 'rgba(255, 255, 255, 0.66)',
    icon: 'rgba(255, 255, 255, 0.9)',
  },

  paper: {
    /* The images stay dark, so the type over them stays white; only the
       backdrop behind the rail turns over. */
    background: '#f2f3f6',
    dim: 'linear-gradient(180deg, rgba(18, 22, 30, 0.44) 0%, rgba(18, 22, 30, 0.62) 100%)',
    scrim: 'linear-gradient(180deg, rgba(10, 12, 18, 0) 34%, rgba(10, 12, 18, 0.54) 68%, rgba(10, 12, 18, 0.86) 100%)',
    title: '#ffffff',
    body: 'rgba(255, 255, 255, 0.84)',
    number: '#ffffff',
    numberDim: 'rgba(255, 255, 255, 0.7)',
    icon: 'rgba(255, 255, 255, 0.92)',
  },

  ember: {
    background: 'radial-gradient(120% 120% at 50% 0%, #241410 0%, #120a09 58%, #060404 100%)',
    dim: 'linear-gradient(180deg, rgba(14, 6, 4, 0.54) 0%, rgba(14, 6, 4, 0.74) 100%)',
    scrim: 'linear-gradient(180deg, rgba(12, 5, 4, 0) 34%, rgba(12, 5, 4, 0.58) 68%, rgba(12, 5, 4, 0.92) 100%)',
    title: '#ffffff',
    body: 'rgba(255, 240, 232, 0.84)',
    number: '#ffffff',
    numberDim: 'rgba(255, 238, 228, 0.7)',
    icon: 'rgba(255, 242, 235, 0.92)',
  },
}

export default presets

