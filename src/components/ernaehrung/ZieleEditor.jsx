import { useState } from 'react'

const FELDER = [
  { key: 'kcal', label: 'Kalorien', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'kohlenhydrate', label: 'Kohlenhydrate', unit: 'g' },
  { key: 'fett', label: 'Fett', unit: 'g' },
]

export default function ZieleEditor({ goals, onSave, onClose }) {
  const [form, setForm] = useState({ ...goals })

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white w-full md:max-w-sm md:rounded-[14px] rounded-t-[14px] p-5 border border-[#E8E6E1]">
        <h3 className="font-bold text-[#1A1A1A] mb-4">Tagesziele anpassen</h3>
        <div className="space-y-3">
          {FELDER.map(({ key, label, unit }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="text-sm text-[#6B6B6B] w-28">{label}</label>
              <input
                type="number" min="0" value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                className="flex-1 border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              />
              <span className="text-sm text-[#A8A8A8] w-8">{unit}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => { onSave(form); onClose() }}
            className="flex-1 bg-[#2D6A4F] text-white py-2.5 rounded-[10px] text-sm font-semibold hover:bg-[#235C42] transition-colors"
          >
            Speichern
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-[10px] text-sm text-[#1A1A1A] border border-[#CFCCC5] bg-white hover:bg-[#F2F1EE] transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}
