import { START_RATING } from '../../shared/engine.ts'
import type { RatingPoint } from '../../shared/types.ts'

/** Rating over time — one point per match, starting from 1000. */
export function RatingChart({ history, color, name }: { history: RatingPoint[]; color: string; name: string }) {
  const W = 640
  const H = 200
  const P = { l: 44, r: 12, t: 14, b: 26 }
  const values = [START_RATING, ...history.map((h) => h.rating)]
  if (values.length < 2) return <p className="muted">The chart appears after the first match.</p>
  const lo = Math.floor((Math.min(...values) - 10) / 25) * 25
  const hi = Math.ceil((Math.max(...values) + 10) / 25) * 25
  const x = (i: number) => P.l + (i / (values.length - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b)
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(values.length - 1).toFixed(1)},${H - P.b} L${x(0).toFixed(1)},${H - P.b} Z`
  const ticks = [lo, Math.round((lo + hi) / 2), hi]
  const peak = Math.max(...values)
  const last = values.at(-1)!
  return (
    <figure className="rating-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${name}'s rating over ${history.length} matches: started at ${START_RATING}, peaked at ${peak}, now ${last}.`}>
        <defs>
          <linearGradient id="rc-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.28" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} className="rating-chart__grid" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" className="rating-chart__tick">{t}</text>
          </g>
        ))}
        <line x1={P.l} x2={W - P.r} y1={y(START_RATING)} y2={y(START_RATING)} className="rating-chart__start" />
        <path d={area} fill="url(#rc-fill)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(values.length - 1)} cy={y(last)} r="4.5" fill={color} className="rating-chart__dot" />
        <text x={P.l} y={H - 6} className="rating-chart__tick">First match</text>
        <text x={W - P.r} y={H - 6} textAnchor="end" className="rating-chart__tick">Latest</text>
      </svg>
    </figure>
  )
}
