import { useMemo, useState } from 'react'
import { ArrowRightLeft, Search, Trash2 } from 'lucide-react'
import { CATEGORIES, CATEGORY_LABELS, type Category } from '../../../shared/schemas.ts'
import { formatMoney } from '../../../shared/money.ts'
import type { Expense, GroupDetail, Settlement } from '../../../shared/types.ts'
import { useDeleteSettlement, useExpenses, useSettlements } from '../../api/hooks.ts'
import { dayOfMonth, formatMonth, formatMonthShort } from '../../lib/dates.ts'
import { useDebounce } from '../../lib/useDebounce.ts'
import { useUi } from '../../lib/uiStore.ts'
import { CategoryIcon, Empty } from '../../ui/bits.tsx'
import { Button } from '../../ui/Button.tsx'
import { PageLoading } from '../../ui/Spinner.tsx'

type Item = { kind: 'expense'; date: string; id: number; e: Expense } | { kind: 'payment'; date: string; id: number; s: Settlement }

export function ExpensesTab({ group, onOpen, onAdd }: { group: GroupDetail; onOpen(e: Expense): void; onAdd(): void }) {
  const expenses = useExpenses(group.id)
  const settlements = useSettlements(group.id)
  const removePayment = useDeleteSettlement(group.id)
  const toast = useUi((s) => s.toast)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | ''>('')
  const q = useDebounce(query.trim().toLowerCase(), 150)
  const name = (id: number) => {
    const m = group.members.find((x) => x.id === id)
    return m?.isYou ? 'You' : (m?.name ?? 'Someone')
  }

  const months = useMemo(() => {
    const items: Item[] = [
      ...(expenses.data ?? [])
        .filter((e) => (!category || e.category === category) && (!q || e.description.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q)))
        .map((e) => ({ kind: 'expense' as const, date: e.date, id: e.id, e })),
      ...(category || q ? [] : (settlements.data ?? []).map((s) => ({ kind: 'payment' as const, date: s.date, id: s.id, s }))),
    ].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    const map = new Map<string, Item[]>()
    for (const it of items) {
      const k = it.date.slice(0, 7)
      map.set(k, [...(map.get(k) ?? []), it])
    }
    return [...map]
  }, [expenses.data, settlements.data, q, category])

  if (expenses.isPending || settlements.isPending) return <PageLoading label="Loading expenses" />
  if (!expenses.data?.length && !settlements.data?.length) {
    return (
      <Empty title="No expenses yet" art="🧾" action={<Button variant="primary" onClick={onAdd}>Add the first expense</Button>}>
        Add what anyone paid for the group. Fairshare keeps the running balance for you.
      </Empty>
    )
  }

  return (
    <div className="stack">
      <div className="filters" role="search">
        <label className="search">
          <Search size={16} aria-hidden />
          <span className="sr-only">Search expenses</span>
          <input type="search" placeholder="Search expenses" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          <span className="sr-only">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category | '')}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </label>
      </div>
      {months.length === 0 && <p className="muted">No expenses match.</p>}
      {months.map(([month, items]) => (
        <section key={month} aria-labelledby={`m-${month}`} className="month">
          <h2 id={`m-${month}`} className="month__title">{formatMonth(month)}</h2>
          <ul className="ledger">
            {items.map((it) =>
              it.kind === 'expense' ? (
                <li key={`e${it.id}`}>
                  <button type="button" className="ledger__row" onClick={() => onOpen(it.e)}>
                    <span className="ledger__date" aria-hidden><span>{formatMonthShort(month)}</span>{dayOfMonth(it.date)}</span>
                    <CategoryIcon category={it.e.category} />
                    <span className="ledger__main">
                      <span className="ledger__title">{it.e.description}</span>
                      <span className="muted small">{name(it.e.paidBy)} paid {formatMoney(it.e.amount, group.currency)}</span>
                    </span>
                    <Involvement e={it.e} group={group} />
                  </button>
                </li>
              ) : (
                <li key={`s${it.id}`} className="ledger__payment">
                  <span className="ledger__date" aria-hidden><span>{formatMonthShort(month)}</span>{dayOfMonth(it.date)}</span>
                  <span className="cat cat--payment"><ArrowRightLeft size={18} aria-hidden /></span>
                  <span className="ledger__main">
                    <span className="ledger__title">{name(it.s.fromMember)} paid {name(it.s.toMember) === 'You' ? 'you' : name(it.s.toMember)}</span>
                    <span className="muted small">{formatMoney(it.s.amount, group.currency)}{it.s.note ? ` · ${it.s.note}` : ''}</span>
                  </span>
                  {it.s.canDelete && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Delete payment of ${formatMoney(it.s.amount, group.currency)} from ${name(it.s.fromMember)}`}
                      onClick={() => removePayment.mutate(it.s.id, { onSuccess: () => toast('Payment deleted'), onError: (e) => toast(e.message, 'error') })}
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  )}
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** What this expense means for *you*: lent, borrowed, or not involved. */
function Involvement({ e, group }: { e: Expense; group: GroupDetail }) {
  const mine = e.shares.find((s) => s.memberId === group.myMemberId)?.amount ?? 0
  if (e.paidBy === group.myMemberId) {
    const lent = e.amount - mine
    return lent > 0 ? (
      <span className="involve"><span className="small muted">you lent</span><span className="amount amount--pos">{formatMoney(lent, group.currency)}</span></span>
    ) : (
      <span className="involve"><span className="small muted">your expense</span></span>
    )
  }
  return mine > 0 ? (
    <span className="involve"><span className="small muted">you borrowed</span><span className="amount amount--neg">{formatMoney(mine, group.currency)}</span></span>
  ) : (
    <span className="involve"><span className="small muted">not involved</span></span>
  )
}
