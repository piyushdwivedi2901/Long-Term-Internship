import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useDeleteItem, useItem } from '../api/hooks.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { CATEGORY_LABELS } from '../../shared/schemas.ts'
import { formatInr } from '../../shared/money.ts'
import { coverageAnswer } from '../../shared/warranty.ts'
import { daysBetween, formatDate, formatRelative, localToday } from '../lib/dates.ts'
import { useUi } from '../lib/uiStore.ts'
import { ClaimKit } from '../features/ClaimKit.tsx'
import { CoverageTimeline } from '../features/CoverageTimeline.tsx'
import { CalendarButton } from '../features/ExportActions.tsx'
import { FilesPanel } from '../features/FilesPanel.tsx'
import { ServiceHistory } from '../features/ServiceHistory.tsx'
import { Button } from '../ui/Button.tsx'
import { CategoryIcon, Stamp } from '../ui/bits.tsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.tsx'
import { PageLoading } from '../ui/Spinner.tsx'

export default function ItemPage() {
  const id = Number(useParams().itemId) || 0
  const item = useItem(id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const remove = useDeleteItem()
  const toast = useUi((s) => s.toast)
  const [deleting, setDeleting] = useState(false)
  const today = localToday()
  const remindDays = user?.remindDays ?? 30

  if (item.isPending) return <PageLoading label="Loading item" />
  if (item.isError) {
    return (
      <div className="page page--narrow">
        <title>Not found · Covered</title>
        <h1>We couldn't find that item</h1>
        <p className="muted">It may have been deleted. {item.error.message}</p>
        <div><Link to="/items" className="button">Back to my things</Link></div>
      </div>
    )
  }
  const i = item.data
  const answer = coverageAnswer(i.coverages, today, remindDays)
  const stampSub = i.status === 'covered' || i.status === 'expiring' || i.status === 'partial' ? `until ${formatDate(i.coveredUntil!)}` : i.status === 'expired' ? i.statusNote.replace('Ended ', 'since ') : undefined
  const age = daysBetween(i.purchaseDate, today)

  return (
    <div className="page">
      <title>{`${i.name} · Covered`}</title>
      <Link to="/items" className="back"><ArrowLeft size={16} aria-hidden /> My things</Link>

      <header className="item-head">
        <CategoryIcon category={i.category} size={28} className="cat--lg" />
        <div className="item-head__main">
          <h1>{i.name}</h1>
          <p className="item-head__sub">
            {[i.brand, i.model].filter(Boolean).join(' · ') || CATEGORY_LABELS[i.category]}
            {i.room && <span className="muted"> · {i.room}</span>}
          </p>
        </div>
        <Stamp status={i.status} sub={stampSub} />
        <div className="item-head__actions">
          <Link to={`/items/${i.id}/edit`} className="button button--sm"><Pencil size={15} aria-hidden /> <span>Edit</span></Link>
          <Button size="sm" variant="ghost" icon={<Trash2 size={15} aria-hidden />} onClick={() => setDeleting(true)}>Delete</Button>
        </div>
      </header>

      <section className={`verdict tone--${answer.tone}`} aria-labelledby="verdict">
        <h2 id="verdict" className="verdict__headline">{answer.headline}</h2>
        <p>{answer.detail}</p>
      </section>

      {i.coverages.length > 0 && (
        <section className="card" aria-labelledby="cover-title">
          <div className="card__head">
            <h2 id="cover-title" className="section-title">Warranty cover</h2>
            {i.coverages.some((c) => c.state !== 'expired') && <CalendarButton itemId={i.id} label="Remind me" />}
          </div>
          <CoverageTimeline purchaseDate={i.purchaseDate} coverages={i.coverages} today={today} remindDays={remindDays} />
        </section>
      )}

      <div className="item-grid-2">
        <div className="stack">
          <ClaimKit item={i} owner={user?.name ?? ''} remindDays={remindDays} today={today} />
          <section className="card" aria-labelledby="details-title">
            <h2 id="details-title" className="section-title">Purchase details</h2>
            <dl className="details">
              <div><dt>Bought</dt><dd>{formatDate(i.purchaseDate)} <span className="muted">({age === 0 ? 'today' : formatRelative(-age)})</span></dd></div>
              <div><dt>Price</dt><dd className="mono">{i.price !== null ? formatInr(i.price) : '—'}</dd></div>
              <div><dt>Store</dt><dd>{i.store || '—'}</dd></div>
              <div><dt>Invoice</dt><dd className="mono">{i.invoiceNo || '—'}</dd></div>
              <div><dt>Serial</dt><dd className="mono">{i.serialNo || '—'}</dd></div>
              <div><dt>Category</dt><dd>{CATEGORY_LABELS[i.category]}</dd></div>
            </dl>
            {i.notes && <p className="notes">{i.notes}</p>}
          </section>
        </div>
        <div className="stack">
          <FilesPanel itemId={i.id} files={i.files} />
          <ServiceHistory item={i} />
        </div>
      </div>

      <ConfirmDialog
        open={deleting}
        title={`Delete ${i.name}?`}
        confirmLabel="Delete item"
        busy={remove.isPending}
        onCancel={() => setDeleting(false)}
        onConfirm={() =>
          remove.mutate(i.id, {
            onSuccess: () => {
              toast(`${i.name} deleted`, 'success')
              navigate('/items', { replace: true })
            },
            onError: (e) => {
              toast(e.message, 'error')
              setDeleting(false)
            },
          })
        }
      >
        <p>
          This removes the item with its {i.files.length ? `${i.files.length} saved file${i.files.length === 1 ? '' : 's'}` : 'details'} and repair history. It can't be undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}
