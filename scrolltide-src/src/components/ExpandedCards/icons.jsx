/**
 * The small line marks that sit in a card's footer.
 *
 * Drawn here rather than pulled from an icon package: this component ships
 * with no dependencies, and a caption mark only ever needs a handful of
 * strokes. Every glyph is on a 24 box with a 1.7 stroke so they hold weight
 * against one another, and they inherit `currentColor` so the preset drives
 * them.
 *
 * An item can pass `icon` as one of these names, or as its own node.
 */
const P = (d) => <path d={d} />

export const icons = {
  shield: P('M12 3.2 19 6v5.4c0 4-2.8 7.3-7 8.4-4.2-1.1-7-4.4-7-8.4V6l7-2.8Z'),
  chat: (
    <>
      {P('M20 12.2c0 3.5-3.4 6.3-7.6 6.3-.9 0-1.8-.1-2.6-.4L5 19.5l1.2-3.1C4.8 15.3 4 13.8 4 12.2 4 8.7 7.4 5.9 11.6 5.9S20 8.7 20 12.2Z')}
    </>
  ),
  bag: (
    <>
      {P('M4.8 8h14.4l-1 10.2a1.8 1.8 0 0 1-1.8 1.6H7.6a1.8 1.8 0 0 1-1.8-1.6L4.8 8Z')}
      {P('M9.2 11.4a2.8 2.8 0 0 0 5.6 0')}
    </>
  ),
  tag: (
    <>
      {P('M4 9.6a1.6 1.6 0 0 1 1.6-1.6h8.1c.5 0 1 .2 1.3.6l2.9 3.4-2.9 3.4a1.7 1.7 0 0 1-1.3.6H5.6A1.6 1.6 0 0 1 4 14.4V9.6Z')}
      {P('M11.9 8v8')}
    </>
  ),
  sparkle: (
    <>
      {P('M13.4 3.6 15 8.2l4.6 1.6-4.6 1.6-1.6 4.6-1.6-4.6-4.6-1.6 4.6-1.6 1.6-4.6Z')}
      {P('M7 15.2l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z')}
    </>
  ),
  compass: (
    <>
      {P('M12 3.8a8.2 8.2 0 1 1 0 16.4 8.2 8.2 0 0 1 0-16.4Z')}
      {P('M15.3 8.7 13.6 13.6 8.7 15.3l1.7-4.9 4.9-1.7Z')}
    </>
  ),
  layers: (
    <>
      {P('M12 3.6 20.4 8 12 12.4 3.6 8 12 3.6Z')}
      {P('M4.6 12.2 12 16.2l7.4-4')}
      {P('M4.6 16.1 12 20.1l7.4-4')}
    </>
  ),
  orbit: (
    <>
      {P('M12 8.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Z')}
      {P('M17.7 7.4c2.3 1.6 3.5 3.4 2.9 4.7-.9 2.1-6 2.3-11.3.5S.9 7 1.8 4.9')}
    </>
  ),
  play: P('M9.4 7.3 16.6 12l-7.2 4.7V7.3Z'),
  arrow: (
    <>
      {P('M4.8 12h14')}
      {P('M13.4 6.8 18.6 12l-5.2 5.2')}
    </>
  ),
}

/**
 * Resolves whatever an item put in `icon`: a name from the set above, a ready
 * node, or nothing at all.
 */
export function Icon({ name }) {
  if (!name) return null
  if (typeof name !== 'string') return name

  const glyph = icons[name]
  if (!glyph) return null

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <g
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {glyph}
      </g>
    </svg>
  )
}

export default icons

