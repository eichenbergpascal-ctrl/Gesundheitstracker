import { useState, useEffect, useRef } from 'react'
import { searchFoods, addFood, ALLERGEN_OPTIONS, checkIntolerances } from '../../services/foods'
import NutriScoreBadge from './NutriScoreBadge'

function NutritionPreview({ food, amount }) {
  const f = amount / 100
  return (
    <div style={{
      borderRadius: 10, padding: 12, marginBottom: 16,
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8, textAlign: 'center',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {[
        { label: 'kcal',    val: Math.round((food.energie        ?? 0) * f) },
        { label: 'Protein', val: `${((food.protein       ?? 0) * f).toFixed(1)}g` },
        { label: 'Kohlen.', val: `${((food.kohlenhydrate ?? 0) * f).toFixed(1)}g` },
        { label: 'Fett',    val: `${((food.fett          ?? 0) * f).toFixed(1)}g` },
      ].map(({ label, val }) => (
        <div key={label}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: '#F1F5F9',
            fontFamily: "'JetBrains Mono', monospace",
          }}>{val}</div>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

const inputStyle = {
  padding: '10px 14px', fontSize: 13,
  background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, color: '#F1F5F9', outline: 'none',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  transition: 'border-color 0.2s',
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
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div style={{
        position: 'relative',
        background: '#1E293B',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: 480,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        maxHeight: '90vh',
      }} className="md:rounded-[16px]">

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px', flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={goBack}
            style={{
              color: '#94A3B8', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 20, lineHeight: 1, width: 24,
            }}
          >
            {view !== 'search' ? '←' : '✕'}
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: '#F1F5F9', fontSize: 14, margin: 0 }}>
              {view === 'add' ? 'Neues Lebensmittel eintragen' : 'Lebensmittel hinzufügen'}
            </p>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{mahlzeit.label}</p>
          </div>
        </div>

        {/* Suchleiste */}
        {view === 'search' && (
          <form onSubmit={handleSearch} style={{
            display: 'flex', gap: 8, padding: 12, flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Lebensmittel suchen…"
              style={{ ...inputStyle, flex: 1 }}
              onFocus={e => e.target.style.borderColor = '#10B981'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
            <button
              type="submit"
              disabled={searching}
              style={{
                padding: '10px 16px', fontSize: 13, fontWeight: 600,
                background: 'linear-gradient(135deg, #10B981, #06B6D4)',
                color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
                opacity: searching ? 0.6 : 1,
              }}
            >
              {searching ? '…' : 'Suchen'}
            </button>
          </form>
        )}

        {/* Inhalt */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Suchansicht */}
          {view === 'search' && (
            <div>
              {!hasSearched && (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#475569' }}>
                  <p style={{ fontSize: 14 }}>Nach Lebensmitteln suchen</p>
                </div>
              )}

              {results.map(food => (
                <button
                  key={food.id}
                  onClick={() => { setSelected(food); setView('detail') }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#F1F5F9', margin: 0 }} className="truncate">
                      {food.name}
                    </p>
                    {food.brand && (
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }} className="truncate">{food.brand}</p>
                    )}
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{food.energie} kcal · pro 100 g</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <NutriScoreBadge grade={food.nutriscore} />
                    <span style={{ color: '#475569', fontSize: 16 }}>›</span>
                  </div>
                </button>
              ))}

              {searchErr && (
                <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '24px 16px 8px' }}>
                  {searchErr}
                </p>
              )}

              {hasSearched && (
                <button
                  onClick={() => {
                    setAddForm(f => ({ ...f, name: query }))
                    setView('add')
                  }}
                  style={{
                    width: '100%', padding: '16px', fontSize: 13, color: '#10B981',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  Nicht gefunden? <strong>Lebensmittel hinzufügen</strong>
                </button>
              )}
            </div>
          )}

          {/* Detailansicht */}
          {view === 'detail' && selected && (
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(16,185,129,0.1)',
                }} />
                <div>
                  <p style={{ fontWeight: 600, color: '#F1F5F9', fontSize: 14, margin: 0 }}>{selected.name}</p>
                  {selected.brand && (
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{selected.brand}</p>
                  )}
                  {selected.nutriscore && (
                    <div style={{ marginTop: 4 }}><NutriScoreBadge grade={selected.nutriscore} /></div>
                  )}
                  {!selected.created_by && (
                    <span style={{ fontSize: 11, color: '#475569', display: 'block', marginTop: 2 }}>System-Datenbank</span>
                  )}
                </div>
              </div>

              <label style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8, display: 'block' }}>Menge in Gramm</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[50, 100, 150, 200].map(g => (
                  <button
                    key={g}
                    onClick={() => setAmount(g)}
                    style={{
                      padding: '8px 12px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                      border: amount === g ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      background: amount === g ? 'linear-gradient(135deg, #10B981, #06B6D4)' : 'transparent',
                      color: amount === g ? '#fff' : '#94A3B8', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {g}g
                  </button>
                ))}
                <input
                  type="number" min="1" max="5000"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  style={{ ...inputStyle, width: 72 }}
                />
              </div>

              <NutritionPreview food={selected} amount={amount} />

              {selected.allergene?.length > 0 && (
                <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selected.allergene.map(a => (
                    <span key={a} style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 999,
                      background: 'rgba(239,68,68,0.12)', color: '#EF4444',
                      border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                      {a}
                    </span>
                  ))}
                </div>
              )}

              {intoleranceWarnings.length > 0 ? (
                <div style={{
                  borderRadius: 12, border: '2px solid rgba(245,158,11,0.3)',
                  background: 'rgba(245,158,11,0.08)', padding: 16, marginBottom: 4,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B', marginBottom: 8, marginTop: 0 }}>
                    Unverträglichkeit erkannt
                  </p>
                  <ul style={{ marginBottom: 12, padding: 0, listStyle: 'none' }}>
                    {intoleranceWarnings.map(w => (
                      <li key={w} style={{ fontSize: 13, color: '#F59E0B', marginBottom: 4 }}>
                        Dieses Produkt kann <strong>{w}</strong> enthalten.
                      </li>
                    ))}
                  </ul>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setIntoleranceWarnings([])}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 10, fontSize: 13,
                        border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                        color: '#94A3B8', cursor: 'pointer',
                      }}
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleConfirmAnyway}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: '#B45309', color: '#fff', border: 'none', cursor: 'pointer',
                      }}
                    >
                      Trotzdem hinzufügen
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConfirm}
                  style={{
                    width: '100%', padding: '14px', fontSize: 14, fontWeight: 600,
                    background: 'linear-gradient(135deg, #10B981, #06B6D4)',
                    color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
                  }}
                >
                  Hinzufügen zu {mahlzeit.label}
                </button>
              )}
            </div>
          )}

          {/* Hinzufügen-Formular */}
          {view === 'add' && (
            <form onSubmit={handleSaveNew} style={{ padding: 16, paddingBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                borderRadius: 10, padding: '10px 12px', fontSize: 12, textAlign: 'center',
                background: 'rgba(16,185,129,0.08)', color: '#10B981',
                border: '1px solid rgba(16,185,129,0.15)',
              }}>
                Dieses Lebensmittel wird für <strong>alle Nutzer</strong> dauerhaft gespeichert.
              </div>

              {[
                { key: 'name', label: 'Name *', placeholder: 'z.B. Haferflocken (zart)', required: true },
                { key: 'brand', label: 'Marke (optional)', placeholder: 'z.B. Kölln, Nestlé …', required: false },
              ].map(({ key, label, placeholder, required }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: '#94A3B8', marginBottom: 5, display: 'block' }}>{label}</label>
                  <input
                    value={addForm[key]} placeholder={placeholder} required={required}
                    onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#10B981'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#94A3B8', marginBottom: 5, display: 'block' }}>Kalorien * (kcal/100g)</label>
                  <input
                    type="number" min="0" step="1" value={addForm.energie} placeholder="z.B. 372" required
                    onChange={e => setAddForm(f => ({ ...f, energie: e.target.value }))}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#10B981'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#94A3B8', marginBottom: 5, display: 'block' }}>NutriScore</label>
                  <select
                    value={addForm.nutriscore}
                    onChange={e => setAddForm(f => ({ ...f, nutriscore: e.target.value }))}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="">– unbekannt –</option>
                    {['a','b','c','d','e'].map(s => (
                      <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  ['protein', 'Protein (g)'],
                  ['kohlenhydrate', 'Kohlen. (g)'],
                  ['fett', 'Fett (g)'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, color: '#94A3B8', marginBottom: 5, display: 'block' }}>{label}</label>
                    <input
                      type="number" min="0" step="0.1" value={addForm[key]} placeholder="0"
                      onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = '#10B981'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                    />
                  </div>
                ))}
              </div>

              <details>
                <summary style={{ fontSize: 11, color: '#475569', cursor: 'pointer', padding: '4px 0' }}>
                  + Weitere Nährwerte (optional)
                </summary>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  {[
                    ['gesaettigte_fettsaeuren', 'Ges. Fettsäuren (g)'],
                    ['zucker', 'Zucker (g)'],
                    ['ballaststoffe', 'Ballaststoffe (g)'],
                    ['salz', 'Salz (g)'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, color: '#94A3B8', marginBottom: 5, display: 'block' }}>{label}</label>
                      <input
                        type="number" min="0" step="0.01" value={addForm[key]} placeholder="0"
                        onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                        onFocus={e => e.target.style.borderColor = '#10B981'}
                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                      />
                    </div>
                  ))}
                </div>
              </details>

              <div>
                <label style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8, display: 'block' }}>Allergene</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ALLERGEN_OPTIONS.map(a => (
                    <button
                      key={a} type="button" onClick={() => toggleAllergen(a)}
                      style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 999,
                        border: addForm.allergene.includes(a) ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)',
                        background: addForm.allergene.includes(a) ? 'rgba(239,68,68,0.12)' : 'transparent',
                        color: addForm.allergene.includes(a) ? '#EF4444' : '#94A3B8',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {saveErr && (
                <p style={{
                  fontSize: 12, borderRadius: 10, padding: '10px 12px',
                  color: '#EF4444', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}>{saveErr}</p>
              )}

              <button
                type="submit"
                disabled={saving || !addForm.name.trim() || !addForm.energie}
                style={{
                  padding: '14px', fontSize: 14, fontWeight: 600,
                  background: 'linear-gradient(135deg, #10B981, #06B6D4)',
                  color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
                  opacity: (saving || !addForm.name.trim() || !addForm.energie) ? 0.5 : 1,
                }}
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
