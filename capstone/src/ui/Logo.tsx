/** Flowboard mark: a route line through three stops, the last one reached. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="logo">
      <rect width="32" height="32" rx="8" className="logo__bg" />
      <path d="M7 22 C 12 22, 12 10, 17 10 S 22 22, 25 22" className="logo__line" fill="none" strokeWidth="3" strokeLinecap="round" />
      <circle cx="7" cy="22" r="2.6" className="logo__stop" />
      <circle cx="17" cy="10" r="2.6" className="logo__stop" />
      <circle cx="25" cy="22" r="3.4" className="logo__end" />
    </svg>
  )
}
