export default function CalorieRing({ consumed, goal }) {
  const r = 72
  const cx = 90
  const cy = 90
  const circ = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0
  const over = consumed > goal
  const remaining = Math.max(goal - consumed, 0)

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E8E6E1" strokeWidth="14" />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={over ? '#B45309' : '#2D6A4F'}
          strokeWidth="14"
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-[#1A1A1A] leading-none">{Math.round(consumed)}</span>
        <span className="text-xs text-[#A8A8A8] mt-0.5">kcal gegessen</span>
        <span className="text-xs font-semibold mt-1" style={{ color: over ? '#B45309' : '#2D6A4F' }}>
          {over ? `${Math.round(consumed - goal)} über Ziel` : `${Math.round(remaining)} verbleibend`}
        </span>
      </div>
    </div>
  )
}
