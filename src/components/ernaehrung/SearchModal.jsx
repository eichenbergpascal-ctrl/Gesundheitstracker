import { useState, useEffect, useRef } from 'react'
import { searchFoods, addFood, NUTRISCORE_COLORS, ALLERGEN_OPTIONS, checkIntolerances } from '../../services/foods'
import NutriScoreBadge from './NutriScoreBadge'

// Ansichten: 'search' | 'detail' | 'add'

function NutritionPreview({ food, amount }) {
  const f = amount / 100
  return (
    <div className="rounded-[10px] p-3 mb-4 grid grid-cols-4 gap-2 text-center" style={{ backgroundColor: '#F2F1EE' }}>
      {[
        { label: 'kcal',    val: Math.round((food.energie        ?? 0) * f) },
        { label: 'Protein', val: `${((food.protein       ?? 0) * f).toFixed(1)}g` },
        { label: 'Kohlen.', val: `${((food.kohlenhydrate ?? 0) * f).toFixed(1)}g` },
        { label: 'Fett',    val: `${((food.fett          ?? 0) * f).toFixed(1)}g` },
      ].map(({ label, val }) => (
        <div key={label}>
          <div className="text-sm font-bold text-[#1A1A1A]">{val}</div>
          <div className="text-xs text-[#A8A8A8]">{label}</div>
        </div>
      ))}
    </div>
  )
}

export default function SearchModal({ mahlzeit, user, onClose, onAdd, userIntolerances = [] }) {
  const [view, setView]           = useState('search')
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState(null)
  const [selected, setSelected]   = useState(null)
  const [amount, setAmount]       = useState(100)

  const [addForm, setAddForm] = useState({
    name: '', brand: '', nutriscore: '',
    energie: '', protein: '', kohlenhydrate: '', fett: '',
    gesaettigte_fettsaeuren: '', zucker: '', ballaststoffe: '', salz: '',
    allergene: [],
  })
  const [saving, setSaving]   = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [intoleranceWarnings, setIntoleranceWarnings] = useState([])

  const inputRef = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true); setSearchErr(null); setResults([])
    try {
      const foods = await searchFoods(query)
      setResults(foods)
      if (foods.length === 0) setSearchErr('Keine Lebensmittel gefunden.')
    } catch (err) { setSearchErr(err.message) }
    setHasSearched(true)
    setSearching(false)
  }

  async function handleSaveNew(e) {
    e.preventDefault()
    if (!addForm.name.trim() || !addForm.energie) return
    setSaving(true); setSaveErr(null)
    try {
      const food = await addFood(user.id, addForm)
      setSelected(food)
      setView('detail')
    } catch (err) { setSaveErr(err.message) }
    setSaving(false)
  }

  function handleConfirm() {
    if (!selected) return
    const warnings = checkIntolerances(selected, userIntolerances)
    if (warnings.length > 0) {
      setIntoleranceWarnings(warnings)
      return
    }
    onAdd(selected, amount, mahlzeit.id)
    onClose()
  }

  function handleConfirmAnyway() {
    if (!selected) return
    onAdd(selected, amount, mahlzeit.id)
    onClose()
  }

  function toggleAllergen(a) {
    setAddForm(f => ({
      ...f,
      allergene: f.allergene.includes(a)
        ? f.allergene.filter(x => x !== a)
        : [...f.allergene, a],
    }))
  }

  function goBack() {
    if (intoleranceWarnings.length > 0) { setIntoleranceWarnings([]) }
    else if (view === 'add')            { setView('search'); setSaveErr(null) }
    else if (view === 'detail')         { setView('search'); setSelected(null) }
    else                                { onClose() }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative bg-white w-full md:max-w-md md:rounded-[14px] rounded-t-[14px] flex flex-col overflow-hidden border border-[#E8E6E1]"
        style={{ maxHeight: '90vh' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-[#E8E6E1] shrink-0">
          <button
            onClick={goBack}
            className="text-[#A8A8A8] hover:text-[#1A1A1A] text-xl leading-none w-6 transition-colors"
          >
            {view !== 'search' ? '←' : '✕'}
          </button>
          <div className="flex-1">
            <p className="font-semibold text-[#1A1A1A] text-sm">
              {view === 'add' ? 'Neues Lebensmittel eintragen' : 'Lebensmittel hinzufügen'}
            </p>
            <p className="text-xs text-[#A8A8A8]">{mahlzeit.label}</p>
          </div>
        </div>

        {/* ── Suchleiste ─────────────────────────────────────────────────────── */}
        {view === 'search' && (
          <form onSubmit={handleSearch} className="flex gap-2 p-3 border-b border-[#E8E6E1] shrink-0">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Lebensmittel suchen…"
              className="flex-1 border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-[#2D6A4F] text-white text-sm px-4 py-2 rounded-[10px] hover:bg-[#235C42] disabled:opacity-50 transition-colors font-medium"
            >
              {searching ? '…' : 'Suchen'}
            </button>
          </form>
        )}

        {/* ── Inhalt ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ SUCHANSICHT ══════════════════════════════════════════════════════ */}
          {view === 'search' && (
            <div>
              {!hasSearched && (
                <div className="text-center py-10 text-[#A8A8A8]">
                  <p className="text-sm">Nach Lebensmitteln suchen</p>
                </div>
              )}

              {results.map(food => (
                <button
                  key={food.id}
                  onClick={() => { setSelected(food); setView('detail') }}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#E8E6E1] hover:bg-[#F2F1EE] transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{food.name}</p>
                    {food.brand && (
                      <p className="text-xs text-[#A8A8A8] truncate">{food.brand}</p>
                    )}
                    <p className="text-xs text-[#A8A8A8]">{food.energie} kcal · pro 100 g</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <NutriScoreBadge grade={food.nutriscore} />
                    <span className="text-xs text-[#CFCCC5]">›</span>
                  </div>
                </button>
              ))}

              {searchErr && (
                <p className="text-sm text-[#A8A8A8] text-center pt-6 pb-2">{searchErr}</p>
              )}

              {hasSearched && (
                <button
                  onClick={() => {
                    setAddForm(f => ({ ...f, name: query }))
                    setView('add')
                  }}
                  className="w-full flex items-center gap-2 px-4 py-4 text-sm text-[#2D6A4F] hover:bg-[#E8F0EC] transition-colors border-t border-[#E8E6E1] mt-2"
                >
                  <span>Nicht gefunden? <strong>Lebensmittel hinzufügen</strong></span>
                </button>
              )}
            </div>
          )}

          {/* ══ DETAILANSICHT ════════════════════════════════════════════════════ */}
          {view === 'detail' && selected && (
            <div className="p-4">
              <div className="flex items-start gap-3 mb-5">
                <div
                  className="w-12 h-12 rounded-[10px] shrink-0"
                  style={{ backgroundColor: '#E8F0EC' }}
                />
                <div>
                  <p className="font-semibold text-[#1A1A1A] text-sm">{selected.name}</p>
                  {selected.brand && (
                    <p className="text-xs text-[#A8A8A8]">{selected.brand}</p>
                  )}
                  {selected.nutriscore && (
                    <div className="mt-1">
                      <NutriScoreBadge grade={selected.nutriscore} />
                    </div>
                  )}
                  {!selected.created_by && (
                    <span className="text-xs text-[#A8A8A8] mt-0.5 block">System-Datenbank</span>
                  )}
                </div>
              </div>

              <label className="text-xs text-[#6B6B6B] mb-2 block">Menge in Gramm</label>
              <div className="flex gap-2 mb-4 flex-wrap">
                {[50, 100, 150, 200].map(g => (
                  <button
                    key={g}
                    onClick={() => setAmount(g)}
                    className={`px-3 py-1.5 rounded-[10px] text-sm font-medium border transition-all ${
                      amount === g
                        ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]'
                        : 'border-[#E8E6E1] text-[#6B6B6B] hover:border-[#CFCCC5]'
                    }`}
                  >
                    {g}g
                  </button>
                ))}
                <input
                  type="number" min="1" max="5000"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="w-20 border border-[#E8E6E1] rounded-[10px] px-3 py-1.5 text-sm bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                />
              </div>

              <NutritionPreview food={selected} amount={amount} />

              {selected.allergene?.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1">
                  {selected.allergene.map(a => (
                    <span key={a} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' }}>
                      {a}
                    </span>
                  ))}
                </div>
              )}

              {intoleranceWarnings.length > 0 ? (
                <div className="rounded-[12px] border-2 border-[#F59E0B] bg-[#FFFBEB] p-4 mb-1">
                  <p className="text-sm font-semibold text-[#92400E] mb-2">
                    Unverträglichkeit erkannt
                  </p>
                  <ul className="mb-3 space-y-1">
                    {intoleranceWarnings.map(w => (
                      <li key={w} className="text-sm text-[#92400E] flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0">⚠</span>
                        Dieses Produkt kann <strong>{w}</strong> enthalten.
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIntoleranceWarnings([])}
                      className="flex-1 py-2.5 rounded-[10px] border border-[#E8E6E1] text-sm text-[#6B6B6B] bg-white hover:border-[#CFCCC5] transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleConfirmAnyway}
                      className="flex-1 py-2.5 rounded-[10px] bg-[#B45309] text-white text-sm font-medium hover:bg-[#92400E] transition-colors"
                    >
                      Trotzdem hinzufügen
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConfirm}
                  className="w-full bg-[#2D6A4F] text-white font-semibold py-3 rounded-[10px] hover:bg-[#235C42] transition-colors"
                >
                  Hinzufügen zu {mahlzeit.label}
                </button>
              )}
            </div>
          )}

          {/* ══ HINZUFÜGEN-FORMULAR ══════════════════════════════════════════════ */}
          {view === 'add' && (
            <form onSubmit={handleSaveNew} className="p-4 space-y-3 pb-8">
              {/* Community-Hinweis */}
              <div className="rounded-[10px] px-3 py-2.5 text-xs text-center" style={{ backgroundColor: '#E8F0EC', color: '#2D6A4F' }}>
                Dieses Lebensmittel wird für <strong>alle Nutzer</strong> dauerhaft gespeichert.
              </div>

              <div>
                <label className="text-xs text-[#6B6B6B] mb-1 block">Name *</label>
                <input
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="z.B. Haferflocken (zart)"
                  required
                  className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                />
              </div>

              <div>
                <label className="text-xs text-[#6B6B6B] mb-1 block">Marke (optional)</label>
                <input
                  value={addForm.brand}
                  onChange={e => setAddForm(f => ({ ...f, brand: e.target.value }))}
                  placeholder="z.B. Kölln, Nestlé …"
                  className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-[#6B6B6B] mb-1 block">Kalorien * (kcal / 100 g)</label>
                  <input
                    type="number" min="0" step="1"
                    value={addForm.energie}
                    onChange={e => setAddForm(f => ({ ...f, energie: e.target.value }))}
                    placeholder="z.B. 372"
                    required
                    className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#6B6B6B] mb-1 block">NutriScore</label>
                  <select
                    value={addForm.nutriscore}
                    onChange={e => setAddForm(f => ({ ...f, nutriscore: e.target.value }))}
                    className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                  >
                    <option value="">– unbekannt –</option>
                    {['a','b','c','d','e'].map(s => (
                      <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  ['protein',       'Protein (g)'],
                  ['kohlenhydrate', 'Kohlen. (g)'],
                  ['fett',          'Fett (g)'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs text-[#6B6B6B] mb-1 block">{label}</label>
                    <input
                      type="number" min="0" step="0.1"
                      value={addForm[key]}
                      onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder="0"
                      className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                    />
                  </div>
                ))}
              </div>

              <details>
                <summary className="text-xs text-[#A8A8A8] cursor-pointer hover:text-[#6B6B6B] select-none py-1">
                  + Weitere Nährwerte (optional)
                </summary>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    ['gesaettigte_fettsaeuren', 'Ges. Fettsäuren (g)'],
                    ['zucker',                  'Zucker (g)'],
                    ['ballaststoffe',            'Ballaststoffe (g)'],
                    ['salz',                     'Salz (g)'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="text-xs text-[#6B6B6B] mb-1 block">{label}</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={addForm[key]}
                        onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder="0"
                        className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                      />
                    </div>
                  ))}
                </div>
              </details>

              <div>
                <label className="text-xs text-[#6B6B6B] mb-2 block">Allergene</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALLERGEN_OPTIONS.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAllergen(a)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        addForm.allergene.includes(a)
                          ? 'border-[#FECACA] text-[#991B1B]'
                          : 'border-[#E8E6E1] text-[#6B6B6B] hover:border-[#CFCCC5]'
                      }`}
                      style={addForm.allergene.includes(a) ? { backgroundColor: '#FEE2E2' } : {}}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {saveErr && (
                <p className="text-xs rounded-[10px] px-3 py-2" style={{ color: '#991B1B', backgroundColor: '#FEE2E2' }}>{saveErr}</p>
              )}

              <button
                type="submit"
                disabled={saving || !addForm.name.trim() || !addForm.energie}
                className="w-full bg-[#2D6A4F] text-white font-semibold py-3 rounded-[10px] hover:bg-[#235C42] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Wird gespeichert…' : 'Lebensmittel für alle hinzufügen'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
