import { useEffect, useMemo, useRef, useState } from 'react'
import { springEasing } from '../../lib/shape'
import presets from './presets'
import './FanDeck.css'

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

/**
 * Where a card sits, given how many places it is from the focused one.
 *
 * The spread is not a sideways translate — it is one rotation about a hinge
 * below the deck, the way a hand of cards opens when you push your thumb up
 * the edge. That single origin is what makes it read as a deck rather than a
 * row of tilted rectangles: the bottoms stay gathered near the hinge while the
 * tops swing wide, and the arc falls out of the geometry instead of having to
 * be authored.
 *
 * `rise` is the only thing added on top, and only because pure rotation drops
 * the outer cards less than the eye expects at these angles.
 *
 * `k` is deliberately allowed to be fractional: a finger halfway between two
 * cards is a real arrangement, not a blend of two snapshots.
 */
function place(k, p) {
  const away = Math.abs(k)
  return {
    rot: k * p.angle,
    dy: away * p.rise,
    scale: Math.max(0.3, 1 - away * p.falloff),
    /* 1 on the focused card, 0 by the time it is a full place away. Drives
       everything that only the focused card should carry. */
    t: Math.max(0, 1 - away),
    away,
  }
}

export default function FanDeck({
  items = [],
  preset = 'paper',
  theme,

  /* --- the deck. Lengths are fractions of the container's width, so the fan
     holds its proportions at any size. ------------------------------------ */
  cardWidth = 0.35,
  /* Height over width. 2:3, the shape the reference uses. */
  cardRatio = 1.51,
  cornerRadius = 0.05,
  /* Degrees of swing per place from the middle. */
  angle = 16,
  /* Where the hinge sits, as a multiple of the card's height measured from its
     top edge. Past 1 it is below the card, which is what opens the fan. */
  hinge = 1.6,
  /* Extra drop per place, on top of what the swing already gives. */
  rise = 0.025,
  /* How much smaller each place out is. */
  falloff = 0.06,
  /* Places drawn either side of the focused card. */
  reach = 2,
  /* What the artwork sits at before its card takes focus, so taking focus
     also eases the zoom out. */
  zoom = 1.07,
  /* Height of the aspect box the fan is dealt into. */
  aspect = 1.44,

  /* --- motion ----------------------------------------------------------- */
  /* Seconds for the deck to resettle. */
  speed = 0.78,
  /* 0 is a critically damped glide; 1 overshoots about a quarter. */
  bounce = 0.3,
  /* How far the pointer must travel to turn the deck by one card, as a
     fraction of the container's width. */
  swipe = 0.14,
  dragSensitivity = 1,
  /* Seconds between advances. The deck turns back at the ends rather than
     racing home. Set 0 to hide the play button entirely. */
  autoplay = 4.5,
  playing: playingProp,

  /* --- behaviour --------------------------------------------------------- */
  startIndex,
  controls = true,
  counter = true,
  onChange,

  className = '',
  style,
  ...rest
}) {
  const cards = useMemo(() => items.filter(Boolean), [items])
  const count = cards.length

  const rootRef = useRef(null)
  const cardRefs = useRef([])
  const [index, setIndex] = useState(() =>
    clamp(startIndex ?? Math.floor((count - 1) / 2), 0, Math.max(0, count - 1))
  )
  const [playing, setPlaying] = useState(playingProp ?? false)

  const geom = { angle, rise, falloff }
  const curve = useMemo(() => springEasing(bounce), [bounce])

  const live = useRef(index)
  live.current = index

  const move = (next) => {
    const to = clamp(next, 0, count - 1)
    if (to === live.current) return
    live.current = to
    setIndex(to)
    onChange?.(to, cards[to])
  }

  /* --- painting ---------------------------------------------------------- */

  /**
   * Writes one arrangement onto the cards.
   *
   * React owns the resting states. This exists for everything between them:
   * while a finger is down the deck follows it directly, and a focus of 2.4 is
   * not something the component ever renders.
   */
  const paint = (focus, dragging) => {
    const root = rootRef.current
    if (!root) return
    root.classList.toggle('deck--dragging', !!dragging)

    for (let i = 0; i < cardRefs.current.length; i++) {
      const el = cardRefs.current[i]
      if (!el) continue
      const p = place(i - focus, geom)
      el.style.setProperty('--deck-rot', `${p.rot}deg`)
      el.style.setProperty('--deck-dy', `${p.dy * 100}cqw`)
      el.style.setProperty('--deck-sc', `${p.scale}`)
      el.style.setProperty('--deck-t', `${p.t}`)
      el.style.opacity = p.away > reach + 0.6 ? '0' : '1'
      el.style.zIndex = `${Math.max(1, Math.round(100 - p.away * 10))}`
    }
  }

  /* --- drag -------------------------------------------------------------- */

  const drag = useRef({ active: false, id: null, startX: 0, moved: false, width: 1, offset: 0 })

  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return
    /* The control cluster is not part of the deck's drag surface. */
    if (e.target.closest?.('.deck-controls')) return
    const d = drag.current
    d.active = true
    d.id = e.pointerId
    d.startX = e.clientX
    d.moved = false
    d.offset = 0
    d.width = rootRef.current?.getBoundingClientRect().width || 1
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d.active || d.id !== e.pointerId) return
    const travelled = e.clientX - d.startX
    if (!d.moved) {
      if (Math.abs(travelled) <= 4) return
      d.moved = true
      /* Deferred to here: taken on pointerdown, capture swallows the click on
         the card underneath. */
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    /* Dragging right brings earlier cards in, hence the negation. */
    let offset = (-travelled / (d.width * swipe)) * dragSensitivity
    /* The ends resist rather than tear off — a deck is finite. */
    const lo = -index
    const hi = count - 1 - index
    if (offset < lo) offset = lo + (offset - lo) * 0.28
    if (offset > hi) offset = hi + (offset - hi) * 0.28
    d.offset = offset
    paint(index + offset, true)
  }

  const endDrag = (e) => {
    const d = drag.current
    if (d.id !== e.pointerId) return
    d.active = false
    d.id = null
    if (!d.moved) return
    const landed = clamp(index + Math.round(d.offset), 0, count - 1)
    d.offset = 0
    /* Transitions have to be back on before the resting arrangement is
       written, whether it is written here or by React's next commit —
       otherwise the release snaps instead of springing. */
    rootRef.current?.classList.remove('deck--dragging')
    if (landed === index) paint(index, false)
    else move(landed)
    setTimeout(() => (d.moved = false), 0)
  }

  useEffect(() => {
    if (!drag.current.active) paint(index, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count, angle, rise, falloff, reach])

  /* --- autoplay and keys -------------------------------------------------- */

  useEffect(() => {
    if (!playing || !autoplay || count < 2) return
    let step = 1
    const id = setInterval(() => {
      const at = live.current
      if (at + step > count - 1 || at + step < 0) step = -step
      move(at + step)
    }, autoplay * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, autoplay, count])

  useEffect(() => {
    if (playingProp !== undefined) setPlaying(playingProp)
  }, [playingProp])

  const onKeyDown = (e) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (step) { e.preventDefault(); move(index + step); return }
    if (e.key === 'Home') { e.preventDefault(); move(0) }
    if (e.key === 'End') { e.preventDefault(); move(count - 1) }
  }

  const skin = { ...(presets[preset] || presets.paper), ...theme }

  const vars = {
    '--deck-bg': skin.background,
    '--deck-label': skin.label,
    '--deck-plate': skin.plate,
    '--deck-plate-text': skin.plateText,
    '--deck-control': skin.control,
    '--deck-control-icon': skin.controlIcon,
    '--deck-control-hover': skin.controlHover,
    '--deck-counter': skin.counter,
    '--deck-counter-text': skin.counterText,
    '--deck-shadow-color': skin.shadow,

    '--deck-aspect': aspect,
    '--deck-card-w': `${cardWidth * 100}cqw`,
    '--deck-card-h': `${cardWidth * cardRatio * 100}cqw`,
    '--deck-corner': `${cornerRadius * cardWidth * 100}cqw`,
    '--deck-hinge': `${hinge * 100}%`,
    '--deck-zoom': zoom,

    '--deck-speed': `${speed}s`,
    '--deck-ease': curve,
    ...style,
  }

  if (!count) return null

  const d = drag.current
  const focus = d.active && d.moved ? index + d.offset : index

  return (
    <div
      ref={rootRef}
      className={`deck${className ? ` ${className}` : ''}`}
      style={vars}
      role="region"
      aria-roledescription="carousel"
      aria-label="Card deck"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      {...rest}
    >
      <div className="deck-stage">
        {cards.map((item, i) => {
          const p = place(i - focus, geom)
          const beyond = p.away > reach + 0.6
          const focused = i === index
          return (
            <div
              key={item.id ?? i}
              ref={(el) => (cardRefs.current[i] = el)}
              className={`deck-card${focused ? ' is-focused' : ''}`}
              style={{
                '--deck-rot': `${p.rot}deg`,
                '--deck-dy': `${p.dy * 100}cqw`,
                '--deck-sc': p.scale,
                '--deck-t': p.t,
                opacity: beyond ? 0 : 1,
                zIndex: Math.max(1, Math.round(100 - p.away * 10)),
                pointerEvents: beyond ? 'none' : undefined,
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={item.title ?? item.label ?? `Slide ${i + 1} of ${count}`}
              aria-hidden={focused ? undefined : 'true'}
              onClick={() => {
                /* A drag that happens to end on a card must not also pick it. */
                if (drag.current.moved) return
                if (!focused) move(i)
              }}
            >
              {item.image ? (
                <img
                  className="deck-media"
                  src={item.image}
                  alt={item.alt ?? ''}
                  draggable="false"
                  decoding="async"
                  loading={p.away <= reach ? 'eager' : 'lazy'}
                />
              ) : (
                /* Stands in until real artwork arrives; it unzooms on focus
                   exactly as an image would. */
                <span className="deck-media" style={{ background: item.art }} />
              )}

              <span className="deck-scrim" aria-hidden="true" />

              {item.label && <span className="deck-label">{item.label}</span>}

              {(item.title || item.cta) && (
                <span className="deck-plate">
                  {item.title && <span className="deck-plate-title">{item.title}</span>}
                  {item.cta &&
                    (item.href ? (
                      <a
                        className="deck-plate-cta"
                        href={item.href}
                        tabIndex={focused ? undefined : -1}
                        onClick={(e) => {
                          if (drag.current.moved) e.preventDefault()
                        }}
                      >
                        {item.cta} <span aria-hidden="true">→</span>
                      </a>
                    ) : (
                      <span className="deck-plate-cta">
                        {item.cta} <span aria-hidden="true">→</span>
                      </span>
                    ))}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {controls && (
        <div className="deck-controls">
          {counter && (
            <span className="deck-counter" aria-live="polite">
              {index + 1}/{count}
            </span>
          )}
          <div className="deck-buttons">
            <button
              type="button"
              className="deck-btn"
              aria-label="Previous card"
              disabled={index === 0}
              onClick={() => move(index - 1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14.5 5.5 8 12l6.5 6.5" />
              </svg>
            </button>

            {autoplay > 0 && (
              <button
                type="button"
                className="deck-btn deck-btn--play"
                aria-label={playing ? 'Pause' : 'Play'}
                aria-pressed={playing}
                onClick={() => setPlaying((v) => !v)}
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9.5 6v12M14.5 6v12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.5 5.8 17 12l-8.5 6.2Z" className="deck-fill" />
                  </svg>
                )}
              </button>
            )}

            <button
              type="button"
              className="deck-btn"
              aria-label="Next card"
              disabled={index === count - 1}
              onClick={() => move(index + 1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9.5 5.5 16 12l-6.5 6.5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
