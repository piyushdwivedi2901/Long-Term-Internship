import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Sparkles, Ticket } from 'lucide-react'
import { formatMoney } from '../../shared/money.ts'
import type { GroupSummary, Overview } from '../../shared/types.ts'
import { useOverview, useSeedSample } from '../api/hooks.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { GroupDialog } from '../features/GroupDialog.tsx'
import { JoinDialog } from '../features/JoinDialog.tsx'
import { timeAgo } from '../lib/dates.ts'
import { useUi } from '../lib/uiStore.ts'
import { Amount, BalanceLine, Empty } from '../ui/bits.tsx'
import { Button } from '../ui/Button.tsx'
import { PageLoading } from '../ui/Spinner.tsx'

export default function HomePage() {
  const { user } = useAuth()
  const { data, isPending, error } = useOverview()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const seed = useSeedSample()
  const toast = useUi((s) => s.toast)

  if (isPending) return <PageLoading label="Loading your balances" />
  if (error) return <p className="form-error" role="alert">{error.message}</p>

  return (
    <div className="page">
      <title>Home · Fairshare</title>
      <header className="page-head">
        <div>
          <p className="eyebrow-name">Hi {user?.name.split(' ')[0]}</p>
          <h1>Your balances</h1>
        </div>
        <div className="row">
          <Button icon={<Ticket size={16} aria-hidden />} onClick={() => setJoining(true)}>Join with a code</Button>
          <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => setCreating(true)}>New group</Button>
        </div>
      </header>

      {data.groups.length === 0 ? (
        <Empty
          title="Split your first bill"
          art="🧾"
          action={
            <div className="row center">
              <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => setCreating(true)}>Create a group</Button>
              <Button icon={<Sparkles size={16} aria-hidden />} busy={seed.isPending} onClick={() => seed.mutate(undefined, { onSuccess: () => toast('Added three sample groups', 'success') })}>
                Try with sample groups
              </Button>
            </div>
          }
        >
          Make a group for a trip, your flat or a dinner, add what everyone paid, and Fairshare works out who owes whom.
        </Empty>
      ) : (
        <>
          <Totals totals={data.totals} />
          <div className="home-grid">
            <section aria-labelledby="groups-h">
              <h2 id="groups-h" className="section-title">Groups</h2>
              <GroupList groups={data.groups} />
            </section>
            <section aria-labelledby="recent-h">
              <h2 id="recent-h" className="section-title">Recent</h2>
              <ActivityList items={data.activity} />
            </section>
          </div>
        </>
      )}
      <GroupDialog open={creating} onClose={() => setCreating(false)} />
      <JoinDialog open={joining} onClose={() => setJoining(false)} />
    </div>
  )
}

/** Totals per currency — never add rupees to euros. */
function Totals({ totals }: { totals: Overview['totals'] }) {
  return (
    <div className="totals">
      {totals.map((t) => {
        const net = t.owed - t.owe
        return (
          <section key={t.currency} className="total-card" aria-label={`${t.currency} balance`}>
            <p className="total-card__label">{net === 0 ? 'All settled' : net > 0 ? 'Overall, you are owed' : 'Overall, you owe'}</p>
            <p className={`total-card__big amount--${net > 0 ? 'pos' : net < 0 ? 'neg' : 'zero'}`}>{formatMoney(Math.abs(net), t.currency)}</p>
            <dl className="total-card__split">
              <div><dt>You are owed</dt><dd><Amount value={t.owed} currency={t.currency} /></dd></div>
              <div><dt>You owe</dt><dd><Amount value={-t.owe} currency={t.currency} /></dd></div>
            </dl>
          </section>
        )
      })}
    </div>
  )
}

export function GroupList({ groups }: { groups: GroupSummary[] }) {
  return (
    <ul className="group-list">
      {groups.map((g) => (
        <li key={g.id}>
          <Link to={`/groups/${g.id}`} className="group-row">
            <span className="group-row__emoji" aria-hidden>{g.emoji}</span>
            <span className="group-row__main">
              <span className="group-row__name">{g.name}</span>
              <span className="muted small">{g.memberCount} people · {g.currency}</span>
            </span>
            <BalanceLine value={g.myBalance} currency={g.currency} />
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ActivityList({ items }: { items: Overview['activity'] }) {
  if (!items.length) return <p className="muted">Nothing yet.</p>
  return (
    <ol className="activity">
      {items.map((a) => (
        <li key={a.id}>
          <span className="activity__emoji" aria-hidden>{a.groupEmoji}</span>
          <p>
            <strong>{a.isYou ? 'You' : a.actorName}</strong> {a.text}
            <span className="muted small"> · <Link to={`/groups/${a.groupId}`}>{a.groupName}</Link> · {timeAgo(a.createdAt)}</span>
          </p>
        </li>
      ))}
    </ol>
  )
}
