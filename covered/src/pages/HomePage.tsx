import { Link } from 'react-router-dom'
import { CircleAlert, FileWarning, Plus, ShieldCheck, Sparkles, Wrench } from 'lucide-react'
import { useDashboard, useItems, useSeedSample } from '../api/hooks.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { CLAIM_STATUS_LABELS } from '../../shared/schemas.ts'
import { formatInrCompact, formatInrRounded } from '../../shared/money.ts'
import { KIND_LABELS, STATUS_LABELS, type ItemStatus } from '../../shared/warranty.ts'
import type { Dashboard } from '../../shared/types.ts'
import { daysBetween, formatDate, formatRelative, greeting } from '../lib/dates.ts'
import { useUi } from '../lib/uiStore.ts'
import { CalendarButton } from '../features/ExportActions.tsx'
import { CoveredSearch } from '../features/CoveredSearch.tsx'
import { Button } from '../ui/Button.tsx'
import { CategoryIcon } from '../ui/bits.tsx'
import { PageLoading } from '../ui/Spinner.tsx'

const ORDER: ItemStatus[] = ['covered', 'expiring', 'partial', 'expired', 'none']

function Welcome() {
  const seed = useSeedSample()
  const toast = useUi((s) => s.toast)
  return (
    <section className="welcome">
      <div className="welcome__text">
        <h2>Start with the things that would hurt to repair</h2>
        <p>
          The fridge, the AC, your phone and laptop. Add the purchase date and the warranty from the bill, snap a photo of the bill itself, and
          Covered keeps track from there — down to the 10-year compressor cover nobody remembers.
        </p>
        <div className="row">
          <Link to="/items/new" className="button button--primary"><Plus size={18} aria-hidden /> <span>Add your first item</span></Link>
          <Button
            icon={<Sparkles size={16} aria-hidden />}
            busy={seed.isPending}
            onClick={() => seed.mutate(undefined, { onSuccess: () => toast('Added 10 sample items with bills', 'success'), onError: (e) => toast(e.message, 'error') })}
          >
            Load sample items
          </Button>
        </div>
      </div>
      <ol className="welcome__steps">
        <li><strong>Add it</strong><span>Name, date, price — 30 seconds</span></li>
        <li><strong>Attach the bill</strong><span>Photo or PDF, kept with the item</span></li>
        <li><strong>Forget about it</strong><span>Covered reminds you before cover ends</span></li>
      </ol>
    </section>
  )
}

function StatusBar({ d }: { d: Dashboard }) {
  return (
    <section className="card status-card" aria-labelledby="status-title">
      <div className="card__head">
        <h2 id="status-title" className="section-title">Your things at a glance</h2>
        <Link to="/items" className="link-more">See all {d.itemCount}</Link>
      </div>
      <div className="status-bar" aria-hidden>
        {ORDER.filter((s) => d.counts[s] > 0).map((s) => (
          <span key={s} className={`status-bar__seg seg--${s}`} style={{ flexGrow: d.counts[s] }} />
        ))}
      </div>
      <ul className="legend">
        {ORDER.map((s) => (
          <li key={s}>
            <Link to={`/items?status=${s}`} className={d.counts[s] === 0 ? 'is-zero' : undefined}>
              <span className={`legend__dot seg--${s}`} aria-hidden />
              <span className="legend__label">{STATUS_LABELS[s]}</span>
              <strong>{d.counts[s]}</strong>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const dash = useDashboard()
  const items = useItems()
  if (dash.isPending || items.isPending) return <PageLoading label="Loading your things" />
  if (dash.isError) return <p className="form-error" role="alert">{dash.error.message}</p>
  const d = dash.data
  const first = (user?.name ?? '').split(' ')[0]

  return (
    <div className="page">
      <title>Home · Covered</title>
      <header className="page-head">
        <div>
          <p className="eyebrow">{formatDate(d.today)}</p>
          <h1>{greeting()}, {first}</h1>
        </div>
      </header>

      {d.itemCount === 0 ? (
        <Welcome />
      ) : (
        <>
          <CoveredSearch items={items.data ?? []} />

          <section className="stats" aria-label="Summary">
            <div className="stat">
              <span className="stat__label">Things tracked</span>
              <strong className="stat__value">{d.itemCount}</strong>
              <span className="stat__sub">{formatInrCompact(d.totalValue)} worth</span>
            </div>
            <div className="stat stat--ok">
              <span className="stat__label"><ShieldCheck size={15} aria-hidden /> Value still covered</span>
              <strong className="stat__value" title={formatInrRounded(d.protectedValue)}>{formatInrCompact(d.protectedValue)}</strong>
              <span className="stat__sub">{d.totalValue ? Math.round((d.protectedValue / d.totalValue) * 100) : 0}% of what you own</span>
            </div>
            <Link to="/items?status=expiring" className="stat stat--soon">
              <span className="stat__label"><CircleAlert size={15} aria-hidden /> Ending soon</span>
              <strong className="stat__value">{d.counts.expiring}</strong>
              <span className="stat__sub">within {d.remindDays} days</span>
            </Link>
            <div className="stat">
              <span className="stat__label"><Wrench size={15} aria-hidden /> Repairs logged</span>
              <strong className="stat__value">{d.repairs.count}</strong>
              <span className="stat__sub">{d.repairs.underWarranty} under warranty · {formatInrCompact(d.repairs.spent)} spent</span>
            </div>
          </section>

          <div className="home-grid">
            <div className="stack">
            <section className="card" aria-labelledby="upcoming-title">
              <div className="card__head">
                <h2 id="upcoming-title" className="section-title">Cover ending in the next 6 months</h2>
              </div>
              {d.upcoming.length === 0 ? (
                <p className="muted">Nothing ends in the next six months.</p>
              ) : (
                <ol className="upcoming">
                  {d.upcoming.map((u) => (
                    <li key={`${u.itemId}-${u.kind}-${u.label}`}>
                      <Link to={`/items/${u.itemId}`} className="upcoming__row">
                        <span className={`days ${u.daysLeft <= d.remindDays ? 'days--soon' : ''}`}>
                          <strong>{u.daysLeft}</strong>
                          <span>{u.daysLeft === 1 ? 'day' : 'days'}</span>
                        </span>
                        <span className="upcoming__main">
                          <span className="upcoming__item">{u.itemName}</span>
                          <span className="muted small">
                            {u.kind === 'component' ? `${u.label} cover` : `${KIND_LABELS[u.kind]} warranty`} ends {formatDate(u.end)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
              <div className="card__foot">
                <CalendarButton />
                <span className="muted small">Works with Google, Apple and Outlook calendars</span>
              </div>
            </section>

            {d.recent.length > 0 && (
              <section className="card" aria-labelledby="recent-title">
                <h2 id="recent-title" className="section-title">Recently updated</h2>
                <ul className="mini-list mini-list--icons">
                  {d.recent.map((i) => (
                    <li key={i.id}>
                      <CategoryIcon category={i.category} size={16} />
                      <Link to={`/items/${i.id}`}>{i.name}</Link>
                      <span className="muted small">{i.statusNote}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            </div>

            <div className="stack">
              <StatusBar d={d} />

              {d.openClaims.length > 0 && (
                <section className="card" aria-labelledby="repairs-title">
                  <h2 id="repairs-title" className="section-title">Open repairs</h2>
                  <ul className="mini-list">
                    {d.openClaims.map((c) => (
                      <li key={c.id}>
                        <Link to={`/items/${c.itemId}`}>
                          <strong>{c.itemName}</strong> — {c.issue}
                        </Link>
                        <span className="muted small">
                          {CLAIM_STATUS_LABELS[c.status]} · reported {formatRelative(daysBetween(d.today, c.date))}
                          {c.ticketNo && <> · ticket <span className="mono">{c.ticketNo}</span></>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {d.missingBills > 0 && (
                <Link to="/items?bill=missing" className="nudge">
                  <FileWarning size={20} aria-hidden />
                  <span>
                    <strong>{d.missingBills} {d.missingBills === 1 ? 'item has' : 'items have'} no bill saved.</strong> Most service centres won't honour a warranty without one.
                  </span>
                </Link>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  )
}
