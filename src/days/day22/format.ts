export const kb = (bytes: number) => `${(bytes / 1000).toFixed(bytes < 10_000 ? 1 : 0)} kB`
export const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v} ms`)
export const pctChange = (before: number, after: number) =>
  before === 0 ? '—' : `${after <= before ? '−' : '+'}${Math.abs(Math.round(((after - before) / before) * 100))}%`
