import { Link } from 'react-router-dom'
import { EmptyState } from '../ui/bits.tsx'

export default function NotFoundPage({ what = 'page' }: { what?: string }) {
  return (
    <div className="page">
      <EmptyState title={`This ${what} doesn't exist`} action={<Link className="button button--primary" to="/">Go to the dashboard</Link>}>
        The link may be out of date, or the {what} was deleted.
      </EmptyState>
    </div>
  )
}
