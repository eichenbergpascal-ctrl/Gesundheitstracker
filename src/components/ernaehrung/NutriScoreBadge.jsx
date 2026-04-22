import { NUTRISCORE_COLORS } from '../../services/foods'

export default function NutriScoreBadge({ grade }) {
  if (!grade) return null
  const s = NUTRISCORE_COLORS[grade.toLowerCase()]
  if (!s) return null
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}
