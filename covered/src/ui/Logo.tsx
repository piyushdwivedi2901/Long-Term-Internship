/** Covered mark: a shield with a tick — "yes, it's covered". */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="logo">
      <path className="logo__shield" d="M16 2.5 4.5 6.6v8.6c0 7 4.8 12.4 11.5 14.3 6.7-1.9 11.5-7.3 11.5-14.3V6.6Z" />
      <path className="logo__tick" d="m10.4 16.2 3.9 3.9 7.4-8" fill="none" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
