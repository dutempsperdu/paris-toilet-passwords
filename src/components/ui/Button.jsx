function Button({
  type = 'button',
  variant = 'secondary',
  className = '',
  children,
  loading = false,
  ...props
}) {
  return (
    <button
      type={type}
      className={`tp-btn ${VARIANT_CLASS[variant] ?? VARIANT_CLASS.secondary} ${className}`.trim()}
      disabled={loading}
      {...props}
    >
      {loading ? '...' : children}
    </button>
  )
}
