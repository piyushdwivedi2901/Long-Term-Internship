import { useParams } from 'react-router-dom'
import { JoinFlow } from '../features/JoinFlow.tsx'

/** Opened from a shared invite link: #/join/K7QM2XPA */
export default function JoinPage() {
  const code = (useParams().code ?? '').toUpperCase()
  return (
    <div className="page page--narrow">
      <title>Join a crew · Couch Cup</title>
      <h1>Join a crew</h1>
      <div className="card">
        <JoinFlow initialCode={code} />
      </div>
    </div>
  )
}
