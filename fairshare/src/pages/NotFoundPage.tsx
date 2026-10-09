import { Link } from 'react-router-dom'
import { Empty } from '../ui/bits.tsx'

export default function NotFoundPage({ what = 'page' }: { what?: string }) {
  return (
    <div className="page">
      <Empty title={`This ${what} isn't here`} art="🔍" action={<Link to="/" className="button button--primary">Go home</Link>}>
        The link may be old, or you may not be a member of this {what}.
      </Empty>
    </div>
  )
}
