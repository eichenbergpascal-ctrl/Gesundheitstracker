export default function CalorieRing({ consumed, goal }) {
  const size = 160
  const sw = 14
  const r = (size - sw) / 2
  const cx = size / 2
  const circ = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const over = consumed > goal
  const remaining = Math.max(goal - consumed, 0)
  const dash = pct * circ

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="calRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={over ? '#F59E0B' : '#10B981'} />
            <stop offset="100%" stopColor={over ? '#F97066' : '#06B6D4'} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke="url(#calRingGrad)"
          strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 28, fontWeight: 700, color: '#F1F5F9', lineHeight: 1,
        }}>
          {Math.round(consumed)}
        </span>
        <span style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>/ {goal} kcal</span>
        <span style={{
          fontSize: 11, fontWeight: 600, marginTop: 4,
          color: over ? '#F59E0B' : '#10B981',
        }}>
          {over
            ? `${Math.round(consumed - goal)} über Ziel`
            : `${Math.round(remaining)} verbleibend`}
        </span>
      </div>
    </div>
  )
}
