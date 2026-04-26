const STATUS_CLASS = {
  working: 'tp-status-working',
  broken: 'tp-status-broken',
  warning: 'tp-status-warning',
  high: 'tp-status-high',
  medium: 'tp-status-medium',
  low: 'tp-status-low',
}

function StatusBadge({ status = 'warning', label }) {
  return (
    <span className={`tp-status-badge ${STATUS_CLASS[status] ?? STATUS_CLASS.warning}`}>
      {label}
    </span>
  )
}

export default StatusBadge
