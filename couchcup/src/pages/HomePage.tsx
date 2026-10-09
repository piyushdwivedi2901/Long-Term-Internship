import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Plus, Sparkles, Trophy, UserPlus } from 'lucide-react'
import { useOverview, useSeedSample } from '../api/hooks.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { greeting, timeAgo } from '../lib/dates.ts'
import { useUi } from '../lib/uiStore.ts'
import { CrewDialog } from '../features/CrewDialog.tsx'
import { JoinDialog } from '../features/JoinFlow.tsx'
import { Button } from '../ui/Button.tsx'
import { PageLoading } from '../ui/Spinner.tsx'

function Welcome({ onCreate, onJoin }: { onCreate(): void; onJoin(): void }) {
  const seed = useSeedSample()
  const toast = useUi((s) => s.toast)
  return (
    <section className="welcome">
      <div className="welcome__text">
        <p className="kicker">Kick-off</p>
        <h2>Settle who's actually the best on the sticks</h2>
        <p>
          Start a crew with the friends you play with. Run a league or a knockout cup, enter scores from the sofa, and let the table, the bracket
          and everyone's rating do the arguing for you.
        </p>
        <div className="row">
          <Button variant="primary" icon={<Plus size={18} aria-hidden />} onClick={onCreate}>Start a crew</Button>
          <Button icon={<UserPlus size={18} aria-hidden />} onClick={onJoin}>Join with a code</Button>
          <Button variant="ghost" icon={<Sparkles size={16} aria-hidden />} busy={seed.isPending} onClick={() => seed.mutate(undefined, { onSuccess: () => toast('Loaded a sample crew with two seasons and a cup', 'success'), onError: (e) => toast(e.message, 'error') })}>
            Load a sample crew
          </Button>
        </div>
      </div>
      <ol className="welcome__steps">
        <li><strong>Crew up</strong><span>Add your mates — they can claim their name later</span></li>
        <li><strong>Pick a format</strong><span>League or knockout. Fixtures draw themselves</span></li>
        <li><strong>Play &amp; log it</strong><span>Score, clubs, penalties — ten seconds</span></li>
      </ol>
    </section>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  const overview = useOverview()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  if (overview.isPending) return <PageLoading label="Loading your crews" />
  if (overview.isError) return <p className="form-error" role="alert">{overview.error.message}</p>
  const { crews, activity } = overview.data

  return (
    <div className="page">
      <title>Crews · Couch Cup</title>
      <header className="page-head">
        <div>
          <p className="kicker">{greeting()}</p>
          <h1>{user?.name.split(' ')[0]}'s crews</h1>
        </div>
        {crews.length > 0 && (
          <div className="row">
            <Button icon={<UserPlus size={17} aria-hidden />} onClick={() => setJoining(true)}>Join with a code</Button>
            <Button variant="primary" icon={<Plus size={17} aria-hidden />} onClick={() => setCreating(true)}>Start a crew</Button>
          </div>
        )}
      </header>

      {crews.length === 0 ? (
        <Welcome onCreate={() => setCreating(true)} onJoin={() => setJoining(true)} />
      ) : (
        <div className="home-grid">
          <ul className="crew-list" aria-label="Your crews">
            {crews.map((c) => (
              <li key={c.id}>
                <Link to={`/crews/${c.id}`} className="crew-card">
                  <span className="crew-card__rank" aria-hidden>
                    <span>#{c.myRank}</span>
                  </span>
                  <span className="crew-card__main">
                    <span className="crew-card__name">{c.name}</span>
                    <span className="crew-card__meta">
                      {c.playerCount} players · {c.matchCount} matches
                      {c.activeCompetitions > 0 && <> · <Trophy size={13} aria-hidden className="inline-icon" /> {c.activeCompetitions} running</>}
                    </span>
                  </span>
                  <span className="crew-card__rating">
                    <strong>{c.myRating}</strong>
                    <span>you're #{c.myRank} of {c.playerCount}</span>
                  </span>
                  <ChevronRight size={20} aria-hidden className="crew-card__go" />
                </Link>
              </li>
            ))}
          </ul>
          <section className="card" aria-labelledby="feed-title">
            <h2 id="feed-title" className="section-title">Latest</h2>
            {activity.length === 0 ? (
              <p className="muted">Nothing yet.</p>
            ) : (
              <ul className="feed">
                {activity.map((a) => (
                  <li key={a.id}>
                    <p>
                      <strong>{a.isYou ? 'You' : a.actorName}</strong> {a.text}
                    </p>
                    <span className="muted small">{a.crewName} · {timeAgo(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      <CrewDialog open={creating} onClose={() => setCreating(false)} />
      <JoinDialog open={joining} onClose={() => setJoining(false)} />
    </div>
  )
}
