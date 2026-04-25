import { useState } from 'react'

const FELDER = [
  { key: 'kcal', label: 'Kalorien', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'kohlenhydrate', label: 'Kohlenhydrate', unit: 'g' },
  { key: 'fett', label: 'Fett', unit: 'g' },
]

const inputStyle = {
  flex: 1, padding: '10px 12px', fontSize: 13,
  background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, color: '#F1F5F9', outline: 'none',
}

export default function ZieleEditor({ goals, onSave, onClose }) {
  const [form, setForm] = useState({ ...goals })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div style={{
        position: 'relative',
        background: '#1E293B',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px 16px 0 0',
        padding: 20,
        width: '100%',
        maxWidth: 400,
      }} className="md:rounded-[16px]">
        <h3 style={{ fontWeight: 700, color: '#F1F5F9', marginBottom: 16, fontSize: 15 }}>
          Tagesziele anpassen
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FELDER.map(({ key, label, unit }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ fontSize: 13, color: '#94A3B8', width: 112, flexShrink: 0 }}>{label}</label>
              <input
                type="number" min="0" value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#10B981'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
              <span style={{ fontSize: 12, color: '#475569', width: 32, flexShrink: 0 }}>{unit}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            onClick={() => { onSave(form); onClose() }}
            style={{
              flex: 1, padding: '12px 16px', fontSize: 13, fontWeight: 600,
              background: 'linear-gradient(135deg, #10B981, #06B6D4)',
              color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
            }}
          >
            Speichern
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 16px', fontSize: 13, fontWeight: 500,
              background: 'transparent', color: '#94A3B8',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, cursor: 'pointer',
            }}
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}
