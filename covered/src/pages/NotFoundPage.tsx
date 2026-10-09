import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { Empty } from '../ui/bits.tsx'

export default function NotFoundPage() {
  return (
    <div className="page page--narrow">
      <title>Page not found · Covered</title>
      <Empty icon={<SearchX size={36} strokeWidth={1.5} />} title="This page doesn't exist" action={<Link to="/" className="button button--primary">Go home</Link>}>
        The link may be old, or the item was deleted.
      </Empty>
    </div>
  )
}
