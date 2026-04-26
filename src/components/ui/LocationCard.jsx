import Card from './Card'
import StatusBadge from './StatusBadge'
import Button from './Button'
import CodeBox from './CodeBox'

function getTimeLabel(minutesAgo, t) {
  if (minutesAgo < 60) return t('verified.minutes', { count: minutesAgo })
  if (minutesAgo < 1440) return t('verified.hours', { count: Math.floor(minutesAgo / 60) })
  return t('verified.days', { count: Math.floor(minutesAgo / 1440) })
}

function LocationCard({
  name,
  address,
  distance,
  code,
  status,
  confidence,
  lastVerifiedMinutes,
  confirmationsToday,
  t,
}) {
  return (
    <Card className="tp-location-card">
      
      {/* HEADER */}
      <div className="tp-card-header">
        <div>
          <h3 className="tp-location-title">{name}</h3>
          <p className="tp-location-meta">
            {address} • {distance}
          </p>
        </div>

        <StatusBadge
          status={confidence}
          label={t(`confidence.${confidence}`)}
        />
      </div>

      {/* VERIFIED TIME */}
      <p className="tp-verified">
        {t('verified.label')} {getTimeLabel(lastVerifiedMinutes, t)}
      </p>

      {/* CODE */}
      {code && <CodeBox>{code}</CodeBox>}

      {/* SOCIAL PROOF */}
      {confirmationsToday > 0 && (
        <p className="tp-social-proof">
          {t('confirmations.today', { count: confirmationsToday })}
        </p>
      )}

      {/* ACTIONS */}
      <div className="tp-card-actions">
        <Button variant="primary">
          {t('actions.stillWorks')}
        </Button>

        <Button variant="danger">
          {t('actions.notWorking')}
        </Button>
      </div>

      {/* MICROCOPY */}
      <p className="tp-microcopy">
        {t('microcopy.quickHelp')}
      </p>

    </Card>
  )
}

export default LocationCard
