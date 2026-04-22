export default function MacroBar({ label, consumed, goal, color }) {
  const pct = Math.min((consumed / goal) * 100, 100)
  const over = consumed > goal
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#6B6B6B] w-24 shrink-0">{label}</span>
      <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ backgroundColor: '#E8E6E1' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: over ? '#B45309' : color }}
        />
      </div>
      <span className="text-xs font-medium text-[#6B6B6B] w-20 text-right shrink-0">
        {consumed.toFixed(0)}<span className="text-[#A8A8A8]">/{goal}g</span>
      </span>
    </div>
  )
}
