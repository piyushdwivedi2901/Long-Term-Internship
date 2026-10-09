/** Fairshare mark: a coin cut into two unequal, fair slices. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="logo">
      <circle cx="16" cy="16" r="15" className="logo__coin" />
      <path d="M16 16 L16 1 A15 15 0 0 1 29.5 22.5 Z" className="logo__slice" />
      <circle cx="16" cy="16" r="15" className="logo__ring" fill="none" strokeWidth="2" />
    </svg>
  )
}
