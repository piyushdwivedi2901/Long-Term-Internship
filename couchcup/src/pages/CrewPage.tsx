import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Gamepad2, Plus } from 'lucide-react'
import type { Match } from '../../shared/types.ts'
import { useCrew } from '../api/hooks.ts'
import { CompetitionDialog } from '../features/CompetitionDialog.tsx'
import { ResultDialog } from '../features/ResultDialog.tsx'
import { CompetitionsTab } from '../features/crew/CompetitionsTab.tsx'
import { OverviewTab } from '../features/crew/OverviewTab.tsx'
import { PlayersTab } from '../features/crew/PlayersTab.tsx'
import { ResultsTab } from '../features/crew/ResultsTab.tsx'
import { RivalsTab } from '../features/crew/RivalsTab.tsx'
import { useRecentClubs } from '../features/useRecentClubs.ts'
import { Button } from '../ui/Button.tsx'
import { Kit, byId } from '../ui/bits.tsx'
import { PageLoading } from '../ui/Spinner.tsx'
import { TabPanel, Tabs } from '../ui/Tabs.tsx'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'competitions', label: 'Competitions' },
  { id: 'results', label: 'Results' },
  { id: 'rivals', label: 'Head-to-head' },
  { id: 'players', label: 'Players' },
]

export default function CrewPage() {
  const id = Number(useParams().crewId) || 0
  const crew = useCrew(id)
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab')! : 'overview'
  const recentClubs = useRecentClubs(id)
  // Keep the match while the dialog animates out, so its title doesn't flip.
  const [dialog, setDialog] = useState<{ open: boolean; match: Match | null; knockout: boolean }>({ open: false, match: null, knockout: false })
  const [newComp, setNewComp] = useState(false)
  const players = useMemo(() => byId(crew.data?.players ?? []), [crew.data])

  if (crew.isPending) return <PageLoading label="Loading crew" />
  if (crew.isError) {
    return (
      <div className="page page--narrow">
        <title>Crew not found · Couch Cup</title>
        <h1>We couldn't find that crew</h1>
        <p className="muted">{crew.error.message}</p>
        <div><Link to="/" className="button">Back to your crews</Link></div>
      </div>
    )
  }
  const c = crew.data
  const openMatch = (m: Match) => {
    const comp = c.competitions.find((x) => x.id === m.competitionId)
    setDialog({ open: true, match: m, knockout: comp?.format === 'knockout' })
  }
  const friendly = () => setDialog({ open: true, match: null, knockout: false })

  return (
    <div className="page">
      <title>{`${c.name} · Couch Cup`}</title>
      <Link to="/" className="back"><ArrowLeft size={16} aria-hidden /> Crews</Link>
      <header className="crew-head">
        <div className="crew-head__main">
          <h1>{c.name}</h1>
          <div className="crew-head__squad" aria-label={`${c.playerCount} players`}>
            <span className="kits" aria-hidden>
              {c.players.slice(0, 8).map((p) => <Kit key={p.id} player={p} size={28} />)}
            </span>
            <span className="muted">{c.playerCount} players · {c.matchCount} matches played</span>
          </div>
        </div>
        <div className="crew-head__me">
          <span className="crew-head__label">Your rating</span>
          <strong>{c.myRating}</strong>
          <span className="muted small">#{c.myRank} of {c.playerCount}</span>
        </div>
        <div className="crew-head__actions">
          <Button icon={<Gamepad2 size={17} aria-hidden />} onClick={friendly}>Play a friendly</Button>
          <Button variant="primary" icon={<Plus size={17} aria-hidden />} onClick={() => setNewComp(true)}>New competition</Button>
        </div>
      </header>

      <Tabs tabs={TABS} active={tab} label="Crew sections" idPrefix="crew" onChange={(t) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true })} />
      <TabPanel id={tab} idPrefix="crew">
        {tab === 'overview' && <OverviewTab crew={c} players={players} onOpen={openMatch} />}
        {tab === 'competitions' && <CompetitionsTab crew={c} players={players} onNew={() => setNewComp(true)} />}
        {tab === 'results' && <ResultsTab crewId={c.id} players={c.players} onOpen={openMatch} onFriendly={friendly} />}
        {tab === 'rivals' && <RivalsTab crewId={c.id} players={c.players} onOpen={openMatch} />}
        {tab === 'players' && <PlayersTab key={c.name} crew={c} />}
      </TabPanel>

      <ResultDialog open={dialog.open} onClose={() => setDialog((d) => ({ ...d, open: false }))} crewId={c.id} players={c.players} match={dialog.match} knockout={dialog.knockout} recentClubs={recentClubs} />
      <CompetitionDialog open={newComp} onClose={() => setNewComp(false)} crewId={c.id} players={c.players} />
    </div>
  )
}
