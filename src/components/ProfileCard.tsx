import { Sparkles } from 'lucide-react'

export interface ProfileCardProps {
  name: string
  bio: string
  /** Absolute URL of the avatar image. */
  image: string
  field: string
  /** Year the person was most active. */
  year: number
}

/**
 * Reusable profile card (originally defined inline in Task 2, now a typed
 * component in its own file — see Task 27). The props interface is the
 * contract: omit a field or pass the wrong type and `tsc` fails.
 */
export function ProfileCard({ name, bio, image, field, year }: ProfileCardProps) {
  return (
    <div className="card">
      <img className="card-avatar" src={image} alt={name} />
      <h3 className="card-name">{name}</h3>
      <p className="pill" style={{ marginBottom: 8 }}>
        <Sparkles size={11} /> {field}
      </p>
      <p className="card-bio">{bio}</p>
      <p className="hint" style={{ marginTop: 10, marginBottom: 0 }}>Active {year}</p>
    </div>
  )
}
