import { Link } from 'react-router-dom'
import { Flag } from 'lucide-react'
import { Empty } from '../ui/bits.tsx'

export default function NotFoundPage() {
  return (
    <div className="page page--narrow">
      <title>Offside · Couch Cup</title>
      <Empty icon={<Flag size={36} strokeWidth={1.5} />} title="Offside — this page doesn't exist" action={<Link to="/" className="button button--primary">Back to your crews</Link>}>
        The link may be old, or the crew or competition was deleted.
      </Empty>
    </div>
  )
}
