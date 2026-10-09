import { CATEGORY_LABELS } from '../../../shared/schemas.ts'
import { formatMoney } from '../../../shared/money.ts'
import type { GroupDetail } from '../../../shared/types.ts'
import { useInsights } from '../../api/hooks.ts'
import { formatMonthShort } from '../../lib/dates.ts'
import { CategoryIcon, Empty } from '../../ui/bits.tsx'
import { PageLoading } from '../../ui/Spinner.tsx'

export function InsightsTab({ group }: { group: GroupDetail }) {
  const { data, isPending } = useInsights(group.id)
  if (isPending || !data) return <PageLoading label="Crunching numbers" />
  if (data.total === 0) return <Empty title="Nothing to analyse yet" art="📊">Add a few expenses to see where the money goes.</Empty>
  const fmt = (n: number) => formatMoney(n, group.currency)
  const maxCat = Math.max(...data.byCategory.map((c) => c.amount))
  const maxMonth = Math.max(1, ...data.byMonth.map((m) => m.amount))
  const name = (id: number) => group.members.find((m) => m.id === id)

  return (
    <div className="insights">
      <section className="insight-total" aria-label="Total spent">
        <p className="muted">Total group spending</p>
        <p className="big-number">{fmt(data.total)}</p>
        <p className="muted small">across {group.expenseCount} expenses</p>
      </section>

      <section aria-labelledby="cat-h">
        <h2 id="cat-h" className="section-title">By category</h2>
        <ul className="cat-bars">
          {data.byCategory.map((c) => (
            <li key={c.category}>
              <CategoryIcon category={c.category} size={16} />
              <span className="cat-bars__label">{CATEGORY_LABELS[c.category]} <span className="muted small">· {c.count}</span></span>
              <span className="cat-bars__track" aria-hidden><span className={`cat-bars__fill cat--${c.category}`} style={{ width: `${(c.amount / maxCat) * 100}%` }} /></span>
              <span className="amount">{fmt(c.amount)}</span>
              <span className="muted small cat-bars__pct">{Math.round((c.amount / data.total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="month-h">
        <h2 id="month-h" className="section-title">Last six months</h2>
        <figure className="month-chart">
          <svg viewBox="0 0 360 150" role="img" aria-label={data.byMonth.map((m) => `${formatMonthShort(m.month)}: ${fmt(m.amount)}`).join(', ')}>
            <line x1="0" x2="360" y1="120" y2="120" className="axis" />
            {data.byMonth.map((m, i) => {
              const h = (m.amount / maxMonth) * 100
              return (
                <g key={m.month}>
                  <rect x={i * 60 + 14} y={120 - h} width="32" height={Math.max(h, m.amount ? 2 : 0)} rx="4" className="month-chart__bar">
                    <title>{`${formatMonthShort(m.month)}: ${fmt(m.amount)}`}</title>
                  </rect>
                  <text x={i * 60 + 30} y="138" textAnchor="middle" className="month-chart__tick">{formatMonthShort(m.month)}</text>
                </g>
              )
            })}
          </svg>
        </figure>
      </section>

      <section aria-labelledby="who-h">
        <h2 id="who-h" className="section-title">Who paid vs. who used</h2>
        <table className="paid-table">
          <thead>
            <tr><th scope="col">Person</th><th scope="col">Paid</th><th scope="col">Their share</th></tr>
          </thead>
          <tbody>
            {data.perMember.map((p) => {
              const m = name(p.memberId)
              return (
                <tr key={p.memberId}>
                  <th scope="row">{m?.isYou ? `${m.name} (you)` : m?.name}</th>
                  <td className="amount">{fmt(p.paid)}</td>
                  <td className="amount">{fmt(p.share)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
