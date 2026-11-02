import { useState } from 'react'
import presets from './presets'
import './HoverTabs.css'

/**
 * A list of services beside one picture. Hovering (or focusing, or tapping)
 * a row makes it the active tab: it takes on the picture frame's colour,
 * opens to show its description, and joins the frame through two concave
 * corners — so the tab and the frame read as one shape — while the picture
 * crossfades to the row's own.
 */
export default function HoverTabs({
  items = [],
  preset = 'paper',
  theme,
  startIndex = 0,
  onChange,

  /* --- layout ------------------------------------------------------------ */
  /* Width over height of the whole component. */
  aspect = 2.1,
  /* Share of the width the tab column takes. */
  tabsWidth = 0.25,
  /* Space above the first tab, fraction of the height. */
  tabsTop = 0.07,
  /* Frame thickness around the picture, and the corner radii, px. */
  frame = 8,
  radius = 24,
  tabRadius = 12,

  /* --- motion ------------------------------------------------------------ */
  /* Seconds for the tab to open and the picture to change. */
  speed = 0.45,

  className = '',
  style,
  ...rest
}) {
  const colours = { ...(presets[preset] || presets.paper), ...theme }
  const [active, setActive] = useState(Math.min(startIndex, Math.max(0, items.length - 1)))
  const pick = (i) => {
    if (i === active) return
    setActive(i)
    onChange?.(i)
  }

  const vars = {
    '--ht-aspect': aspect,
    '--ht-tabs': `${tabsWidth * 100}%`,
    '--ht-top': `${tabsTop * 100}%`,
    '--ht-frame': `${frame}px`,
    '--ht-radius': `${radius}px`,
    '--ht-tab-radius': `${tabRadius}px`,
    '--ht-speed': `${speed}s`,
    '--ht-bg': colours.background,
    '--ht-surface': colours.surface,
    '--ht-title': colours.title,
    '--ht-text': colours.text,
    ...style,
  }

  return (
    <div className={`ht ${className}`.trim()} style={vars} {...rest}>
      <div className="ht__grid">
        <div className="ht__tabs" role="tablist" aria-orientation="vertical">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              id={`ht-tab-${i}`}
              aria-selected={i === active}
              className={`ht__tab${i === active ? ' is-active' : ''}`}
              onPointerEnter={(e) => e.pointerType === 'mouse' && pick(i)}
              onFocus={() => pick(i)}
              onClick={() => pick(i)}
            >
              <span className="ht__title">{it.title}</span>
              {it.description && (
                <span className="ht__more">
                  <span className="ht__text">{it.description}</span>
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="ht__panel" role="tabpanel" aria-labelledby={`ht-tab-${active}`}>
          <div className="ht__pictures">
            {items.map((it, i) => (
              <img
                key={i}
                src={it.image}
                alt={i === active ? it.alt ?? it.title ?? '' : ''}
                aria-hidden={i !== active}
                className={i === active ? 'is-active' : ''}
                decoding="async"
                draggable={false}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

