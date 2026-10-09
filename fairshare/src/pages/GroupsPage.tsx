import { useState } from 'react'
import { Plus, Ticket } from 'lucide-react'
import { useGroups } from '../api/hooks.ts'
import { GroupDialog } from '../features/GroupDialog.tsx'
import { JoinDialog } from '../features/JoinDialog.tsx'
import { Empty } from '../ui/bits.tsx'
import { Button } from '../ui/Button.tsx'
import { PageLoading } from '../ui/Spinner.tsx'
import { GroupList } from './HomePage.tsx'

export default function GroupsPage() {
  const { data, isPending } = useGroups()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  if (isPending) return <PageLoading label="Loading groups" />
  return (
    <div className="page">
      <title>Groups · Fairshare</title>
      <header className="page-head">
        <h1>Groups</h1>
        <div className="row">
          <Button icon={<Ticket size={16} aria-hidden />} onClick={() => setJoining(true)}>Join with a code</Button>
          <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => setCreating(true)}>New group</Button>
        </div>
      </header>
      {data?.length ? <GroupList groups={data} /> : <Empty title="No groups yet" art="👥">Create one, or join a friend's with their invite code.</Empty>}
      <GroupDialog open={creating} onClose={() => setCreating(false)} />
      <JoinDialog open={joining} onClose={() => setJoining(false)} />
    </div>
  )
}
