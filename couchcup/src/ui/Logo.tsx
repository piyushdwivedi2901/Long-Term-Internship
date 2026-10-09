/** Couch Cup mark: a trophy on a pitch-green tile. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="logo">
      <rect width="32" height="32" rx="8" className="logo__tile" />
      <path d="M10 7h12v4a6 6 0 0 1-12 0Z" className="logo__cup" />
      <path d="M10 9H7a3 3 0 0 0 3 4M22 9h3a3 3 0 0 1-3 4" fill="none" strokeWidth="1.8" className="logo__handles" />
      <path d="M14 17h4v4h-4zM11 23h10v2H11z" className="logo__cup" />
    </svg>
  )
}
