/**
 * Colour presets for <FanDeck />.
 *
 * The cards are full-bleed artwork, so a preset is everything around them: the
 * table the deck is dealt on, the plate colour that carries the call to
 * action, and the control cluster.
 *
 * `plate` is the loudest thing on the page by design — it is the only
 * saturated block in an otherwise photographic composition, which is what
 * makes it read as the button rather than as part of the picture.
 */
export const presets = {
  paper: {
    background: '#ffffff',
    label: '#ffffff',
    plate: '#e9ff3d',
    plateText: '#0d0f12',
    control: '#111317',
    controlIcon: '#ffffff',
    controlHover: '#2a2e36',
    counter: 'rgba(17, 19, 23, 0.42)',
    counterText: '#ffffff',
    shadow: 'rgba(24, 26, 34, 0.26)',
  },

  ink: {
    background: '#0c0e12',
    label: '#ffffff',
    plate: '#e9ff3d',
    plateText: '#0d0f12',
    control: '#ffffff',
    controlIcon: '#111317',
    controlHover: '#d9dde4',
    counter: 'rgba(255, 255, 255, 0.3)',
    counterText: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.6)',
  },

  bone: {
    background: '#f2ede4',
    label: '#ffffff',
    plate: '#1d1f24',
    plateText: '#f7f4ee',
    control: '#1d1f24',
    controlIcon: '#f7f4ee',
    controlHover: '#3a3d45',
    counter: 'rgba(29, 31, 36, 0.4)',
    counterText: '#ffffff',
    shadow: 'rgba(86, 70, 48, 0.28)',
  },

  ultra: {
    background: '#101014',
    label: '#ffffff',
    plate: '#ff4d2e',
    plateText: '#ffffff',
    control: '#ff4d2e',
    controlIcon: '#ffffff',
    controlHover: '#ff6b52',
    counter: 'rgba(255, 255, 255, 0.28)',
    counterText: '#ffffff',
    shadow: 'rgba(0, 0, 0, 0.62)',
  },
}

export default presets
