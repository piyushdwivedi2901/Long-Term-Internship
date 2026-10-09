export function Spinner({ size = 18, label }: { size?: number; label?: string }) {
  return (
    <span className="spinner" style={{ width: size, height: size }} role={label ? 'status' : undefined} aria-label={label}>
      <span aria-hidden />
    </span>
  )
}

export function PageLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="page-loading">
      <Spinner size={22} label={label} />
    </div>
  )
}
