import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { round, step, toMask, springEasing } from '../../lib/shape'
import presets from './presets'
import './CardFolder.css'

/* The folder face is drawn in a viewBox this wide; height follows `aspect`.
   Everything scales with the card, so the notch keeps its proportions. */
const VB_W = 300

/**
 * Outline of the folder face: a flat tab on the left, a smooth S-curve
 * stepping down, then the lower shelf.
 */
function buildEdge(tab, notch) {
  return `M0 0${step(VB_W * tab, 0, notch)}H${VB_W}`
}

/* Same outline, closed into a fillable shape that runs to the bottom. */
function buildFace(vbH, tab, notch) {
  return `${buildEdge(tab, notch)}V${round(vbH)}H0Z`
}

/* useLayoutEffect warns during SSR (Next.js, Remix); fall back on the server. */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M7.5 16.5 16.5 7.5M9 7.5h7.5V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function CardFolder({
  number,
  title,
  description,
  /* Artwork behind the folder. `image` wins; otherwise the preset gradient. */
  image,
  /* Transparent cut-out that rises from behind the folder on hover. Pairs with
     `art`/the preset gradient as the backdrop, not with `image`. */
  subject,
  subjectTop = 0.04,
  subjectHeight = 0.5,
  subjectDrop = 0.46,
  subjectScale = 0.88,
  /* Which part of the image stays in frame; the folder covers the bottom, so
     biasing upward brings more of the subject into the closed state. */
  imagePosition = 'center',
  art,
  /* Rendered as <a> when href is set, <button> when onClick is, else <div>. */
  href,
  onClick,
  /* Look */
  preset = 'indigo',
  theme,
  /* Geometry */
  aspect = 0.72,
  tab = 0.62,
  notch = 30,
  radius = 28,
  frameWidth = 7,
  /* Motion — fractions of the card height that the folder sits down by. */
  closedOffset = 0.2,
  openOffset = 0.54,
  duration = 760,
  /* 0 = no overshoot, 0.75 = default, 1 = very bouncy. */
  bounce = 0.75,
  /* Leave unset to keep the spring; pass any easing to override it. */
  easing,
  spring = true,
  /* Extras */
  glass = true,
  grain = true,
  edge = true,
  icon,
  className = '',
  style,
  ...rest
}) {
  const skin = { ...(presets[preset] || presets.indigo), ...theme }

  const { facePath, edgePath, vbH } = useMemo(() => {
    const h = VB_W / aspect
    return {
      vbH: h,
      facePath: buildFace(h, tab, notch),
      edgePath: buildEdge(tab, notch),
    }
  }, [aspect, tab, notch])

  const mask = useMemo(() => toMask(facePath, VB_W, vbH), [facePath, vbH])

  /* Only feeds the @supports block in the stylesheet, so browsers without
     linear() keep the cubic-bezier instead of a broken value. */
  const springCurve = useMemo(() => springEasing(bounce), [bounce])

  /* The number rides down with the folder while the title stays pinned to the
     card, so a long title can be run into. Measure both and stop the folder
     just short of the text instead of letting them overlap. */
  const innerRef = useRef(null)
  const headRef = useRef(null)
  const textRef = useRef(null)
  const [open, setOpen] = useState(openOffset)

  useIsoLayoutEffect(() => {
    const inner = innerRef.current
    const head = headRef.current
    const text = textRef.current
    if (!inner || !head) return

    const measure = () => {
      const height = inner.clientHeight
      if (!height) return
      const headH = head.offsetHeight
      const textH = text ? text.offsetHeight : 0
      const room = (height - textH - headH - headH * 0.32) / height
      setOpen(Math.max(closedOffset, Math.min(openOffset, room)))
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(inner)
    ro.observe(head)
    if (text) ro.observe(text)
    return () => ro.disconnect()
  }, [openOffset, closedOffset])

  const Tag = href ? 'a' : onClick ? 'button' : 'div'

  const vars = {
    '--cf-frame': skin.frame,
    '--cf-panel': skin.panel,
    '--cf-title': skin.title,
    '--cf-desc': skin.description,
    '--cf-arrow': skin.arrow,
    '--cf-edge': skin.edge,
    '--cf-aspect': aspect,
    '--cf-radius': `${radius}px`,
    '--cf-frame-w': `${frameWidth}px`,
    '--cf-closed': `${closedOffset * 100}%`,
    '--cf-open': `${open * 100}%`,
    '--cf-dur': `${duration}ms`,
    ...(subject
      ? {
          '--cf-subject': `url("${subject}")`,
          '--cf-subject-top': `${subjectTop * 100}%`,
          '--cf-subject-height': `${subjectHeight * 100}%`,
          '--cf-subject-drop': `${subjectDrop * 100}%`,
          '--cf-subject-scale': subjectScale,
        }
      : null),
    '--cf-sheen': skin.sheen || 'none',
    '--cf-sheen-blend': skin.sheenBlend || 'screen',
    '--cf-sheen-opacity': skin.sheenOpacity ?? 0.5,
    ...(spring ? { '--cf-spring': springCurve } : null),
    ...(easing ? { '--cf-ease': easing, '--cf-slide-ease': easing } : null),
    ...style,
  }

  return (
    <Tag
      className={`cf-card${className ? ` ${className}` : ''}`}
      style={vars}
      href={href}
      onClick={onClick}
      type={Tag === 'button' ? 'button' : undefined}
      {...rest}
    >
      <span className="cf-inner" ref={innerRef}>
        <span
          className="cf-art"
          style={{
            background: image
              ? `url("${image}") ${imagePosition}/cover no-repeat`
              : art || skin.art,
          }}
        />
        {glass && skin.sheen && <span className="cf-glass" aria-hidden="true" />}
        {subject && <span className="cf-subject" aria-hidden="true" />}
        {grain && <span className="cf-grain" aria-hidden="true" />}

        <span className="cf-panel">
          <span
            className="cf-face"
            style={{ maskImage: mask, WebkitMaskImage: mask }}
            aria-hidden="true"
          />
          {edge && (
            <svg
              className="cf-edge"
              viewBox={`0 0 ${VB_W} ${round(vbH)}`}
              preserveAspectRatio="none"
              aria-hidden="true"
              focusable="false"
            >
              <path d={edgePath} vectorEffect="non-scaling-stroke" />
            </svg>
          )}

          <span className="cf-head" ref={headRef}>
            <span className="cf-number">{number}</span>
            <span className="cf-icon">{icon ?? <ArrowIcon />}</span>
          </span>
        </span>

        <span className="cf-text" ref={textRef}>
          {title && <span className="cf-title">{title}</span>}
          {description && <span className="cf-desc">{description}</span>}
        </span>
      </span>
    </Tag>
  )
}
