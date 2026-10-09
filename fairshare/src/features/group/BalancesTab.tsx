import { ArrowRight, Check } from 'lucide-react'
import { formatMoney } from '../../../shared/money.ts'
import type { GroupDetail, Transfer } from '../../../shared/types.ts'
import { Amount, Avatar } from '../../ui/bits.tsx'
import { Button } from '../../ui/Button.tsx'

/**
 * The signature view: everyone's net position as bars around a zero line,
 * and the shortest list of payments that settles the whole group.
 */
export function BalancesTab({ group, onSettle }: { group: GroupDetail; onSettle(t?: Transfer): void }) {
  const member = (id: number) => group.members.find((m) => m.id === id)!
  const max = Math.max(1, ...group.balances.map((b) => Math.abs(b.net)))

  return (
    <div className="balances-grid">
      <section aria-labelledby="plan-h" className="plan">
        <h2 id="plan-h" className="section-title">Settle-up plan</h2>
        {group.plan.length === 0 ? (
          <p className="plan__done"><Check size={18} aria-hidden /> Everyone is settled up.</p>
        ) : (
          <>
            <p className="muted small">
              {group.plan.length} {group.plan.length === 1 ? 'payment settles' : 'payments settle'} the whole group — the fewest possible with this method.
            </p>
            <ol className="plan__list">
              {group.plan.map((t) => {
                const from = member(t.from)
                const to = member(t.to)
                const label = `${from.isYou ? 'You' : from.name} ${from.isYou ? 'pay' : 'pays'} ${to.isYou ? 'you' : to.name} ${formatMoney(t.amount, group.currency)}`
                return (
                  <li key={`${t.from}-${t.to}`} className="plan__item" aria-label={label}>
                    <span className="plan__person">
                      <Avatar name={from.name} size={36} you={from.isYou} />
                      <span>{from.isYou ? 'You' : from.name}</span>
                    </span>
                    <span className="plan__arrow" aria-hidden>
                      <span className="plan__amount">{formatMoney(t.amount, group.currency)}</span>
                      <span className="plan__line"><ArrowRight size={16} /></span>
                    </span>
                    <span className="plan__person">
                      <Avatar name={to.name} size={36} you={to.isYou} />
                      <span>{to.isYou ? 'You' : to.name}</span>
                    </span>
                    <Button size="sm" onClick={() => onSettle(t)} aria-label={`Record payment: ${label}`}>Record payment</Button>
                  </li>
                )
              })}
            </ol>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={() => onSettle()}>Record a different payment</Button>
      </section>

      <section aria-labelledby="bal-h">
        <h2 id="bal-h" className="section-title">Everyone's balance</h2>
        <ul className="bars">
          {group.balances.map((b) => {
            const m = member(b.memberId)
            const pct = (Math.abs(b.net) / max) * 50
            return (
              <li key={b.memberId}>
                <span className="bars__name">{m.isYou ? `${m.name} (you)` : m.name}</span>
                <span className="bars__track" aria-hidden>
                  <span className={`bars__fill ${b.net >= 0 ? 'is-pos' : 'is-neg'}`} style={b.net >= 0 ? { left: '50%', width: `${pct}%` } : { right: '50%', width: `${pct}%` }} />
                </span>
                <span className="bars__value">
                  {b.net === 0 ? <span className="amount amount--zero">settled</span> : <>{b.net > 0 ? 'gets back ' : 'owes '}<Amount value={b.net} currency={group.currency} /></>}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="muted small">Green bars are owed money; orange bars owe money. Every group's balances add up to zero.</p>
      </section>
    </div>
  )
}
