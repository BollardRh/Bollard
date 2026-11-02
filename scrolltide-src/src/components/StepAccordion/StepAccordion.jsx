import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { springEasing } from '../../lib/shape'
import presets from './presets'
import './StepAccordion.css'

const SPRING = springEasing(0.35)

/**
 * A numbered process accordion with a picture that travels beside it.
 *
 * One step is open at a time. The picture frame slides to sit level with
 * the open step, and the pictures inside it change by morphing: the old one
 * shrinks into a pill and fades while the new one grows out of a pill into
 * the card. Autoplay walks the steps with a progress line along the bottom
 * of the open one, held while the pointer or focus is inside.
 *
 * Below `stackBelow` px the frame column goes away and each step carries its
 * own picture inside its panel.
 */
export default function StepAccordion({
  items = [],
  preset = 'paper',
  theme,
  label = 'How it works',
  /* Shown above the list when set. */
  heading,

  /* --- layout. Lengths are fractions of the component's width. ----------- */
  /* Width of the list column; the picture takes the rest after `gap`. */
  listWidth = 0.47,
  gap = 0.04,
  /* Picture height over width. */
  imageRatio = 0.54,
  /* Corner radius of the picture and the open panel, px. */
  radius = 24,
  panelRadius = 20,
  /* 'right' or 'left'. */
  imageSide = 'right',
  stackBelow = 720,

  /* --- behaviour ---------------------------------------------------------- */
  startIndex = 0,
  /* Clicking the open step closes it. */
  collapsible = false,
  /* Seconds per step; 0 is off. */
  autoplay = 2,
  pauseOnHover = true,
  /* Seconds for the panel and the picture to move. */
  duration = 0.55,
  onChange,

  className = '',
  style,
  ...rest
}) {
  const colours = { ...(presets[preset] || presets.paper), ...theme }
  const n = items.length
  const [open, setOpen] = useState(startIndex)
  const [held, setHeld] = useState(false)
  const [stacked, setStacked] = useState(false)
  const [frameTop, setFrameTop] = useState(0)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const itemRefs = useRef([])
  const frameRef = useRef(null)

  /* --- where the picture frame should sit -------------------------------- */
  useLayoutEffect(() => {
    const root = rootRef.current
    const list = listRef.current
    if (!root || !list) return undefined
    const place = () => {
      setStacked(root.clientWidth < stackBelow)
      if (open < 0) return
      /* The open step's final top: the closed rows above it, which do not
         change height. Read now, mid-animation, it is already right. */
      const rows = itemRefs.current.slice(0, open).filter(Boolean)
      const rowGap = parseFloat(getComputedStyle(list).rowGap) || 0
      let top = 0
      for (const r of rows) top += r.querySelector('.sa__head').offsetHeight + rowGap
      const frameH = frameRef.current?.offsetHeight || 0
      /* Keep the frame inside the list's final height. */
      const head = itemRefs.current[0]?.querySelector('.sa__head').offsetHeight || 0
      const body = itemRefs.current[open]?.querySelector('.sa__inner').scrollHeight || 0
      const listH = n * head + (n - 1) * rowGap + body
      setFrameTop(Math.max(0, Math.min(top, listH - frameH)))
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(root)
    return () => ro.disconnect()
  }, [open, n, stackBelow])

  useEffect(() => {
    onChange?.(open)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  /* --- autoplay ------------------------------------------------------------ */
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const playing = autoplay > 0 && n > 1 && !(pauseOnHover && held) && !reduce && open >= 0
  useEffect(() => {
    if (!playing) return undefined
    const t = setTimeout(() => setOpen((i) => (i + 1) % n), autoplay * 1000)
    return () => clearTimeout(t)
  }, [playing, open, autoplay, n])

  const toggle = (i) => setOpen((cur) => (cur === i ? (collapsible ? -1 : i) : i))

  const onKey = (e, i) => {
    const heads = itemRefs.current.map((r) => r?.querySelector('.sa__head'))
    let to = -1
    if (e.key === 'ArrowDown') to = (i + 1) % n
    else if (e.key === 'ArrowUp') to = (i - 1 + n) % n
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = n - 1
    if (to < 0) return
    e.preventDefault()
    heads[to]?.focus()
  }

  const vars = {
    '--sa-list': `${listWidth * 100}cqw`,
    '--sa-gap': `${gap * 100}cqw`,
    '--sa-ratio': imageRatio,
    '--sa-radius': `${radius}px`,
    '--sa-panel-radius': `${panelRadius}px`,
    '--sa-duration': `${duration}s`,
    '--sa-spring': SPRING,
    '--sa-autoplay': `${autoplay}s`,
    '--sa-bg': colours.background,
    '--sa-panel': colours.panel,
    '--sa-title': colours.title,
    '--sa-text': colours.text,
    '--sa-badge': colours.badge,
    '--sa-badge-text': colours.badgeText,
    '--sa-accent': colours.accent,
    '--sa-accent-text': colours.accentText,
    ...style,
  }

  const picture = (it, i, extra = '') =>
    it.image ? (
      <img className={`sa__img ${extra}`} src={it.image} alt={it.alt || ''} loading={i === startIndex ? 'eager' : 'lazy'} draggable={false} />
    ) : (
      <span className={`sa__img ${extra}`} style={{ background: it.art }} />
    )

  return (
    <section
      ref={rootRef}
      className={`sa ${stacked ? 'is-stacked' : ''} ${imageSide === 'left' ? 'is-flipped' : ''} ${className}`.trim()}
      style={vars}
      aria-label={label}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHeld(false)}
      {...rest}
    >
      {heading && <h2 className="sa__heading">{heading}</h2>}
      <div className="sa__grid">
        <ol ref={listRef} className="sa__list">
          {items.map((it, i) => {
            const isOpen = i === open
            const id = `sa-${i}`
            return (
              <li key={i} ref={(el) => (itemRefs.current[i] = el)} className={`sa__item ${isOpen ? 'is-open' : ''}`}>
                <h3 className="sa__h">
                  <button
                    type="button"
                    className="sa__head"
                    aria-expanded={isOpen}
                    aria-controls={`${id}-panel`}
                    id={`${id}-head`}
                    onClick={() => toggle(i)}
                    onKeyDown={(e) => onKey(e, i)}
                  >
                    <span className="sa__badge">{it.number ?? i + 1}</span>
                    <span className="sa__title">{it.title}</span>
                    <svg className="sa__chev" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="m5 8 5 5 5-5" />
                    </svg>
                  </button>
                </h3>
                <div className="sa__panel" id={`${id}-panel`} role="region" aria-labelledby={`${id}-head`} inert={!isOpen || undefined}>
                  <div className="sa__inner">
                    {stacked && <div className="sa__inline-img">{picture(it, i)}</div>}
                    {it.text && <p className="sa__text">{it.text}</p>}
                    {it.cta && (
                      <a className="sa__cta" href={it.href || '#'} target={it.newTab ? '_blank' : undefined} rel={it.newTab ? 'noreferrer' : undefined}>
                        {it.cta}
                        <svg viewBox="0 0 16 16" aria-hidden="true">
                          <path d="M3 8h9m-4-4 4 4-4 4" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
                {isOpen && playing && <span key={`${open}`} className="sa__progress" aria-hidden="true" />}
              </li>
            )
          })}
        </ol>

        {!stacked && (
          <div className="sa__media" aria-hidden="true">
            <div ref={frameRef} className="sa__frame" style={{ translate: `0 ${frameTop}px` }}>
              {items.map((it, i) => {
                const pic = picture(it, i)
                const card = (
                  <span key={i} className={`sa__card ${i === open ? 'is-active' : ''}`}>
                    {pic}
                  </span>
                )
                return it.href ? (
                  <a key={i} href={it.href} tabIndex={-1} className="sa__card-link" onClick={(e) => i !== open && e.preventDefault()}>
                    {card}
                  </a>
                ) : (
                  card
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
