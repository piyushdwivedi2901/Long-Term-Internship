import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PackageSearch, Plus, Search } from 'lucide-react'
import { useItems } from '../api/hooks.ts'
import { CATEGORIES, CATEGORY_LABELS, type Category } from '../../shared/schemas.ts'
import { STATUS_LABELS, type ItemStatus } from '../../shared/warranty.ts'
import type { ItemSummary } from '../../shared/types.ts'
import { localToday } from '../lib/dates.ts'
import { searchItems } from '../lib/search.ts'
import { CalendarButton, CsvButton } from '../features/ExportActions.tsx'
import { ItemCard } from '../features/ItemCard.tsx'
import { Empty } from '../ui/bits.tsx'
import { PageLoading } from '../ui/Spinner.tsx'

const STATUSES: ItemStatus[] = ['covered', 'expiring', 'partial', 'expired', 'none']
const SORTS = {
  ending: 'Cover ending soonest',
  newest: 'Newest purchase',
  name: 'Name (A–Z)',
  price: 'Price (highest)',
} as const
type Sort = keyof typeof SORTS

const statusRank: Record<ItemStatus, number> = { expiring: 0, covered: 1, partial: 2, expired: 3, none: 4 }
const sorters: Record<Sort, (a: ItemSummary, b: ItemSummary) => number> = {
  // Running cover first (soonest end first), then ended or no warranty.
  ending: (a, b) =>
    (a.status === 'expired' || a.status === 'none' ? 1 : 0) - (b.status === 'expired' || b.status === 'none' ? 1 : 0) ||
    (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9) ||
    statusRank[a.status] - statusRank[b.status],
  newest: (a, b) => b.purchaseDate.localeCompare(a.purchaseDate),
  name: (a, b) => a.name.localeCompare(b.name),
  price: (a, b) => (b.price ?? -1) - (a.price ?? -1),
}

export default function ItemsPage() {
  const items = useItems()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const status = (STATUSES as string[]).includes(params.get('status') ?? '') ? (params.get('status') as ItemStatus) : null
  const missingBill = params.get('bill') === 'missing'
  const category = (CATEGORIES as readonly string[]).includes(params.get('category') ?? '') ? (params.get('category') as Category) : null
  const sort: Sort = (params.get('sort') ?? '') in SORTS ? (params.get('sort') as Sort) : 'ending'
  const today = localToday()

  const set = (key: string, value: string | null) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key === 'status') next.delete('bill')
        if (key === 'bill') next.delete('status')
        return next
      },
      { replace: true },
    )

  const all = items.data ?? []
  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<ItemStatus, number>
    for (const i of all) c[i.status]++
    return c
  }, [all])

  const shown = useMemo(() => {
    let list = q.trim() ? searchItems(all, q) : [...all]
    if (status) list = list.filter((i) => i.status === status)
    if (missingBill) list = list.filter((i) => i.fileCount === 0)
    if (category) list = list.filter((i) => i.category === category)
    return q.trim() ? list : list.sort(sorters[sort])
  }, [all, q, status, missingBill, category, sort])

  if (items.isPending) return <PageLoading label="Loading your things" />
  if (items.isError) return <p className="form-error" role="alert">{items.error.message}</p>

  const filtered = Boolean(q || status || missingBill || category)

  return (
    <div className="page">
      <title>My things · Covered</title>
      <header className="page-head">
        <div>
          <h1>My things</h1>
          <p className="muted">{all.length} {all.length === 1 ? 'item' : 'items'} · bills, warranties and repairs in one place</p>
        </div>
        {all.length > 0 && (
          <div className="row">
            <CalendarButton label="Calendar reminders" />
            <CsvButton />
          </div>
        )}
      </header>

      {all.length === 0 ? (
        <Empty
          icon={<PackageSearch size={36} strokeWidth={1.5} />}
          title="Nothing here yet"
          action={<Link to="/items/new" className="button button--primary"><Plus size={18} aria-hidden /> <span>Add your first item</span></Link>}
        >
          Add something you own — Covered works out every warranty date from the bill.
        </Empty>
      ) : (
        <>
          <div className="toolbar">
            <div className="search">
              <Search size={17} aria-hidden />
              <input type="search" placeholder="Search name, brand, room, serial…" aria-label="Search your things" value={q} onChange={(e) => set('q', e.target.value || null)} />
            </div>
            <select aria-label="Category" value={category ?? ''} onChange={(e) => set('category', e.target.value || null)}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <select aria-label="Sort by" value={sort} onChange={(e) => set('sort', e.target.value === 'ending' ? null : e.target.value)} disabled={!!q.trim()}>
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="filter-chips" role="group" aria-label="Filter by status">
            <button type="button" aria-pressed={!status && !missingBill} onClick={() => set('status', null) /* also clears "bill" */}>
              All <span>{all.length}</span>
            </button>
            {STATUSES.filter((s) => counts[s] > 0 || s === status).map((s) => (
              <button key={s} type="button" aria-pressed={status === s} className={`chip--${s}`} onClick={() => set('status', status === s ? null : s)}>
                {STATUS_LABELS[s]} <span>{counts[s]}</span>
              </button>
            ))}
            <button type="button" aria-pressed={missingBill} onClick={() => set('bill', missingBill ? null : 'missing')}>
              No bill saved <span>{all.filter((i) => i.fileCount === 0).length}</span>
            </button>
          </div>

          <p className="sr-only" aria-live="polite">{filtered ? `${shown.length} of ${all.length} items shown` : ''}</p>
          {shown.length === 0 ? (
            <Empty title="No matches" icon={<Search size={32} strokeWidth={1.5} />}>
              Nothing fits these filters.{' '}
              <button type="button" className="link-btn" onClick={() => setParams({}, { replace: true })}>Clear filters</button>
            </Empty>
          ) : (
            <ul className="item-grid">
              {shown.map((i) => (
                <ItemCard key={i.id} item={i} today={today} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
