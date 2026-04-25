const MACRO_GRADIENTS = {
  Protein:        'linear-gradient(90deg, #8B5CF6, #6366F1)',
  Kohlenhydrate:  'linear-gradient(90deg, #F59E0B, #EAB308)',
  Fett:           'linear-gradient(90deg, #06B6D4, #0D9488)',
}

export default function MacroBar({ label, consumed, goal, color }) {
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0
  const over = consumed > goal
  const gradient = MACRO_GRADIENTS[label] || color

  return (
    <div className="flex items-center gap-3">
      <span style={{ fontSize: 11, color: '#94A3B8', width: 88, flexShrink: 0 }}>{label}</span>
      <div style={{
        flex: 1, height: 8, borderRadius: 999, overflow: 'hidden',
        background: 'rgba(255,255,255,0.06)',
      }}>
        <div style={{
          height: '100%', borderRadius: 999,
          width: `${pct}%`,
          background: over ? '#F59E0B' : gradient,
          transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
          boxShadow: `0 0 8px ${over ? '#F59E0B44' : '#10B98144'}`,
        }} />
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, fontWeight: 600, color: '#F1F5F9',
        width: 80, textAlign: 'right', flexShrink: 0,
      }}>
        {consumed.toFixed(0)}<span style={{ color: '#94A3B8' }}>/{goal}g</span>
      </span>
    </div>
  )
}
