import { useMemo, useRef, useState } from 'react'
import { springEasing } from '../../lib/shape'
import { Icon } from './icons'
import presets from './presets'
import './ExpandedCards.css'

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

/**
 * A rail of cards where one is open and the rest are collapsed to slivers.
 * Hover, tap or tab to a sliver and it widens; its neighbours slide aside to
 * make the room.
 *
 * The whole thing is built so that opening a card costs no layout at all.
 * Every card's box is permanently the *open* width and sits absolutely in the
 * rail; what changes is a `clip-path` that hides the part sticking out to the
 * right, and a `translateX` that places it. Two consequences fall out of
 * that, and both are the reason it is done this way:
 *
 *   - The caption is laid out once, at the open width, and never reflows.
 *     Text rewrapping halfway through a transition is the single thing that
 *     makes one of these look cheap.
 *   - Nothing in the animation touches layout. `transform` runs on the
 *     compositor and `clip-path` is a repaint of one element.
 *
 * `clip-path` clips hit-testing along with painting, so the hidden two thirds
 * of an open card's box do not sit on top of its neighbours and eat their
 * hovers.
 */
export default function ExpandedCards({
  items = [],
  preset = 'void',
  theme,

  /* --- the rail. Lengths are fractions of the rail's own width, so the
     proportions hold at any size. ----------------------------------------- */
  /* Height over width, for the rail as a whole. */
  height = 0.67,
  /* Visible width of a collapsed card. */
  railWidth = 0.094,
  gap = 0.022,
  padding = 0.024,
  iconSize = 0.028,
  cornerRadius = 0.024,

  /* --- motion ----------------------------------------------------------- */
  /* Seconds for a card to open. */
  speed = 0.72,
  /* 0 is a critically damped glide; 1 overshoots about a quarter. Kept low —
     the reference glides, it does not spring. */
  bounce = 0.16,
  /* Scale a collapsed card's image sits at, so opening also unzooms it. */
  zoom = 1.12,
  /* How far the image lags behind the reveal, 0 to 1. The sliver then shows a
     slice from nearer the middle of the picture, and opening slides the rest
     of it into place. */
  parallax = 0.4,
  /* Fraction of the open duration the caption waits before arriving, so the
     type lands in a card that has already made room for it. */
  captionDelay = 0.3,

  /* --- behaviour --------------------------------------------------------- */
  startIndex = 0,
  /* Off by default: the rail holds whichever card you left it on, which is
     calmer than snapping back the moment the pointer strays. */
  revertOnLeave = false,
  showNumbers = true,
  onChange,

  className = '',
  style,
  ...rest
}) {
  const cards = useMemo(() => items.filter(Boolean), [items])
  const count = cards.length

  const home = clamp(startIndex, 0, Math.max(0, count - 1))
  const [active, setActive] = useState(home)
  /* A tap on a linked card opens it first and follows the link second, so a
     touch user gets to read the card they just revealed. */
  const opened = useRef(home)

  const curve = useMemo(() => springEasing(bounce), [bounce])

  const open = (i) => {
    if (i === active) return
    setActive(i)
    opened.current = i
    onChange?.(i, cards[i])
  }

  /* --- geometry ---------------------------------------------------------- */

  /* Slivers and gaps are fixed, so the open card is simply what is left of
     the rail. `max` keeps it from going negative on an absurd card count. */
  const railPct = railWidth * 100
  const gapPct = gap * 100
  const openPct = Math.max(railPct, 100 - (count - 1) * (railPct + gapPct))

  /* Collapsed, a card is barely wider than the mark inside it, so type sitting
     at the left padding reads as off-centre. This is the nudge that centres
     it — the number and the icon are close enough in width to share one. */
  const nudge = ((railWidth - iconSize) / 2 - padding) * 100

  const skin = { ...(presets[preset] || presets.void), ...theme }

  const vars = {
    '--exp-bg': skin.background,
    '--exp-dim': skin.dim,
    '--exp-scrim': skin.scrim,
    '--exp-title': skin.title,
    '--exp-body-color': skin.body,
    '--exp-number': skin.number,
    '--exp-number-dim': skin.numberDim,
    '--exp-icon-color': skin.icon,

    '--exp-ratio': `${1 / height}`,
    '--exp-card-w': `${openPct}cqw`,
    '--exp-pad': `${padding * 100}cqw`,
    '--exp-icon-size': `${iconSize * 100}cqw`,
    '--exp-corner': `${cornerRadius * 100}cqw`,
    '--exp-nudge': `${nudge}cqw`,

    '--exp-speed': `${speed}s`,
    '--exp-ease': curve,
    '--exp-zoom': zoom,
    '--exp-parallax': parallax,
    '--exp-caption-delay': `${speed * captionDelay}s`,
    ...style,
  }

  if (!count) return null

  return (
    <div
      className={`exp${className ? ` ${className}` : ''}`}
      style={vars}
      role="group"
      aria-label="Expanding card rail"
      onPointerLeave={revertOnLeave ? () => open(home) : undefined}
      {...rest}
    >
      <div className="exp-rail">
        {cards.map((item, i) => {
          const isOpen = i === active
          /* Everything left of the open card sits where it always sat; only
             what is to its right gets pushed along by the extra width. */
          const x = i * (railPct + gapPct) + (i > active ? openPct - railPct : 0)
          const Tag = item.href ? 'a' : 'div'

          return (
            <Tag
              key={item.id ?? i}
              className={`exp-card${isOpen ? ' is-open' : ''}`}
              href={item.href}
              style={{
                '--x': `${x}cqw`,
                '--vis': isOpen ? `${openPct}cqw` : `${railPct}cqw`,
                zIndex: isOpen ? count : i,
              }}
              tabIndex={item.href ? undefined : 0}
              role={item.href ? undefined : 'button'}
              aria-expanded={isOpen}
              aria-label={item.title ?? `Card ${i + 1}`}
              onPointerEnter={() => open(i)}
              onFocus={() => open(i)}
              onClick={(e) => {
                if (item.href && opened.current !== i) {
                  /* First tap reveals; the card is now open, so a second one
                     goes through. Pointer devices never reach this — hover
                     opened the card long before it was clicked. */
                  e.preventDefault()
                  open(i)
                }
              }}
              onKeyDown={(e) => {
                if (item.href) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  open(i)
                }
              }}
            >
              {item.image ? (
                <img
                  className="exp-media"
                  src={item.image}
                  alt={item.alt ?? ''}
                  draggable="false"
                  decoding="async"
                  loading={isOpen ? 'eager' : 'lazy'}
                />
              ) : (
                /* Stands in until real artwork arrives, and unzooms on open
                   exactly as an image would. */
                <span className="exp-media" style={{ background: item.art }} />
              )}

              <span className="exp-scrim" aria-hidden="true" />
              <span className="exp-veil" aria-hidden="true" />

              {showNumbers && (
                <span className="exp-num" aria-hidden="true">
                  {String(item.number ?? (i + 1)).padStart(2, '0')}
                </span>
              )}

              <span className="exp-caption">
                {item.description && (
                  <span className="exp-body">{item.description}</span>
                )}
                {(item.icon || item.title) && (
                  <span className="exp-foot">
                    {item.icon && (
                      <span className="exp-mark">
                        <Icon name={item.icon} />
                      </span>
                    )}
                    {item.title && <span className="exp-title">{item.title}</span>}
                  </span>
                )}
              </span>
            </Tag>
          )
        })}
      </div>
    </div>
  )
}

