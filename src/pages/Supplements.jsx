import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useGeolocation } from '../hooks/useGeolocation'
import { useUserSettings } from '../hooks/useUserSettings'
import { fetchUVData } from '../services/openMeteo'
import { calcTotals, DEFAULT_GOALS } from '../utils/ernaehrung'
import { analyzeSupplements } from '../services/supplementGuide'

// ─── Helfer ─────────────────────────────────────────────────────────────────

const ZEITPUNKT_LABEL = { morgens: 'Morgens', mittags: 'Mittags', abends: 'Abends' }
const HAEUFIGKEIT_LABEL = { taeglich: 'Täglich', jeden_2_tag: 'Jeden 2. Tag', woechentlich: 'Wöchentlich' }
const ZEITPUNKTE = ['morgens', 'mittags', 'abends']

const glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 16,
}

const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10, color: '#F1F5F9', outline: 'none',
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA + 'T00:00:00')
  const b = new Date(dateStrB + 'T00:00:00')
  return Math.round((b - a) / 86400000)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function isHeuteFaellig(s) {
  const haeufigkeit = s.haeufigkeit ?? 'taeglich'
  if (haeufigkeit === 'taeglich') return true
  if (!s.letztes_nehmen) return true
  const lastDate = s.letztes_nehmen.slice(0, 10)
  const diff = daysBetween(lastDate, today())
  if (haeufigkeit === 'jeden_2_tag') return diff >= 2
  if (haeufigkeit === 'woechentlich') return diff >= 7
  return true
}

function calculateStreak(supplements) {
  const taegliche = supplements.filter(s => (s.haeufigkeit ?? 'taeglich') === 'taeglich')
  if (taegliche.length === 0) return 0
  let streak = 0
  const base = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const allTaken = taegliche.every(s => s.letztes_nehmen?.startsWith(dateStr))
    if (allTaken) streak++
    else break
  }
  return streak
}

function mapSupp(s) {
  const mapped = {
    ...s,
    dosierung: s.dosis,
    zeitpunkt: s.zeitpunkt_neu ?? 'morgens',
    haeufigkeit: s.haeufigkeit ?? 'taeglich',
    heuteGenommen: s.letztes_nehmen ? s.letztes_nehmen.startsWith(today()) : false,
    letztesNehmen: s.letztes_nehmen,
  }
  mapped.heuteFaellig = isHeuteFaellig(mapped)
  return mapped
}

// ─── StreakCard ──────────────────────────────────────────────────────────────

function StreakCard({ streak }) {
  if (streak === 0) return null
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))',
      border: '1px solid rgba(16,185,129,0.2)',
      borderRadius: 16, padding: 16,
      marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 32, fontWeight: 700,
        background: 'linear-gradient(135deg, #10B981, #06B6D4)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        lineHeight: 1,
      }}>
        {streak}
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#10B981', margin: 0 }}>
          {streak === 1 ? 'Tag' : 'Tage'} in Folge
        </p>
        <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, marginBottom: 0 }}>
          Alle täglichen Supplements eingenommen
        </p>
      </div>
    </div>
  )
}

// ─── SuppCard ────────────────────────────────────────────────────────────────

function SuppCard({ supp, onToggle, onDelete, dimmed = false }) {
  return (
    <div style={{
      ...glass,
      padding: '12px 14px',
      ...(supp.heuteGenommen
        ? { background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }
        : {}),
      opacity: dimmed ? 0.4 : 1,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => onToggle(supp)}
          style={{
            width: 24, height: 24, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: supp.heuteGenommen ? 'none' : '2px solid rgba(255,255,255,0.15)',
            background: supp.heuteGenommen
              ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
              : 'transparent',
            cursor: 'pointer',
            transform: supp.heuteGenommen ? 'scale(1.05)' : 'scale(1)',
            transition: 'all 0.3s cubic-bezier(.175,.885,.32,1.275)',
          }}
        >
          {supp.heuteGenommen && (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 600, margin: 0,
            color: supp.heuteGenommen ? '#A5B4FC' : '#F1F5F9',
          }}>
            {supp.name}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
            {supp.dosierung && (
              <span style={{ fontSize: 11, color: '#94A3B8' }}>{supp.dosierung}</span>
            )}
            <span style={{ fontSize: 11, color: '#475569' }}>
              {HAEUFIGKEIT_LABEL[supp.haeufigkeit] ?? supp.haeufigkeit}
            </span>
          </div>
          {supp.heuteGenommen && (
            <span style={{ fontSize: 10, color: '#818CF8', marginTop: 2, display: 'block' }}>
              Heute genommen
            </span>
          )}
        </div>
        <button
          onClick={() => onDelete(supp.id)}
          style={{
            color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.target.style.color = '#EF4444'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.2)'}
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ─── SupplementTab ───────────────────────────────────────────────────────────

function SupplementTab({ user, prefill, onPrefillConsumed }) {
  const [supplements, setSupplements] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', dosierung: '', zeitpunkt: 'morgens', haeufigkeit: 'taeglich' })
  const [saving, setSaving] = useState(false)
  const [showNichtFaellig, setShowNichtFaellig] = useState(false)
  const [toggleError, setToggleError] = useState(null)

  useEffect(() => {
    if (prefill) {
      setForm({
        name: prefill.name ?? '',
        dosierung: prefill.dosierung ?? '',
        zeitpunkt: prefill.zeitpunkt ?? 'morgens',
        haeufigkeit: prefill.haeufigkeit ?? 'taeglich',
      })
      setShowForm(true)
      onPrefillConsumed?.()
    }
  }, [prefill])

  async function fetchSupplements() {
    const { data } = await supabase
      .from('supplements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')
    setSupplements((data ?? []).map(mapSupp))
  }

  useEffect(() => {
    fetchSupplements()
    const channel = supabase
      .channel('supplements')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'supplements',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchSupplements())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user.id])

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('supplements').insert({
      user_id: user.id,
      name: form.name,
      dosis: form.dosierung,
      zeitpunkt_neu: form.zeitpunkt,
      haeufigkeit: form.haeufigkeit,
      letztes_nehmen: null,
    })
    setForm({ name: '', dosierung: '', zeitpunkt: 'morgens', haeufigkeit: 'taeglich' })
    setShowForm(false)
    setSaving(false)
  }

  async function toggleHeute(supp) {
    const taken = !supp.heuteGenommen
    const previous = supplements
    setSupplements(prev => prev.map(s =>
      s.id === supp.id
        ? { ...s, heuteGenommen: taken, letztesNehmen: taken ? new Date().toISOString() : null }
        : s
    ))
    const { error } = await supabase.from('supplements')
      .update({ letztes_nehmen: taken ? new Date().toISOString() : null })
      .eq('id', supp.id)
      .eq('user_id', user.id)
    if (error) {
      setSupplements(previous)
      setToggleError('Supplement konnte nicht aktualisiert werden.')
    }
  }

  async function handleDelete(id) {
    await supabase.from('supplements').delete().eq('id', id).eq('user_id', user.id)
  }

  const faelligeHeute = supplements.filter(s => s.heuteFaellig)
  const nichtFaellig = supplements.filter(s => !s.heuteFaellig)
  const takenToday = faelligeHeute.filter(s => s.heuteGenommen).length
  const streak = calculateStreak(supplements)

  const selectStyle = {
    ...inputStyle,
    appearance: 'none', WebkitAppearance: 'none',
  }

  return (
    <div>
      {toggleError && (
        <div style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, color: '#EF4444' }}>{toggleError}</span>
          <button onClick={() => setToggleError(null)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#F1F5F9', margin: 0 }}>Supplements</h2>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2, marginBottom: 0 }}>
            {takenToday}/{faelligeHeute.length} heute erledigt
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          style={{
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
          }}
        >
          + Supplement
        </button>
      </div>

      <StreakCard streak={streak} />

      {faelligeHeute.length > 0 && (
        <div style={{ ...glass, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Heutige Einnahme</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, fontWeight: 700, color: '#6366F1',
            }}>
              {takenToday}/{faelligeHeute.length}
            </span>
          </div>
          <div style={{ width: '100%', height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              width: faelligeHeute.length ? `${(takenToday / faelligeHeute.length) * 100}%` : '0%',
              background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {showForm && (
        <div style={{
          background: 'rgba(99,102,241,0.06)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 16, padding: 18, marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#A5B4FC', marginBottom: 14, marginTop: 0 }}>
            Neues Supplement
          </h3>
          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 5 }}>Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="z.B. Vitamin D3, Magnesium, Omega-3"
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#6366F1'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 5 }}>Dosierung</label>
                <input
                  value={form.dosierung}
                  onChange={e => setForm(f => ({ ...f, dosierung: e.target.value }))}
                  placeholder="z.B. 1000 IE, 400 mg, 2 Kapseln"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#6366F1'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 5 }}>Einnahmezeitpunkt</label>
                  <select
                    value={form.zeitpunkt}
                    onChange={e => setForm(f => ({ ...f, zeitpunkt: e.target.value }))}
                    style={selectStyle}
                    onFocus={e => e.target.style.borderColor = '#6366F1'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  >
                    <option value="morgens">Morgens</option>
                    <option value="mittags">Mittags</option>
                    <option value="abends">Abends</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 5 }}>Häufigkeit</label>
                  <select
                    value={form.haeufigkeit}
                    onChange={e => setForm(f => ({ ...f, haeufigkeit: e.target.value }))}
                    style={selectStyle}
                    onFocus={e => e.target.style.borderColor = '#6366F1'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  >
                    <option value="taeglich">Täglich</option>
                    <option value="jeden_2_tag">Jeden 2. Tag</option>
                    <option value="woechentlich">Wöchentlich</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    background: saving ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: '#fff', border: 'none', borderRadius: 10, cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Speichern …' : 'Hinzufügen'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '10px 16px', fontSize: 13, fontWeight: 500,
                    background: 'transparent', color: '#94A3B8',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer',
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {supplements.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
          <p style={{ fontSize: 13 }}>Noch keine Supplements eingetragen.</p>
        </div>
      ) : (
        <>
          {faelligeHeute.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
              {ZEITPUNKTE.map(zp => {
                const gruppe = faelligeHeute.filter(s => s.zeitpunkt === zp)
                if (gruppe.length === 0) return null
                return (
                  <div key={zp}>
                    <h3 style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: '#475569', marginBottom: 8, marginTop: 0,
                    }}>
                      {ZEITPUNKT_LABEL[zp]}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {gruppe.map(supp => (
                        <SuppCard
                          key={supp.id}
                          supp={supp}
                          onToggle={toggleHeute}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {nichtFaellig.length > 0 && (
            <div>
              <button
                onClick={() => setShowNichtFaellig(v => !v)}
                style={{
                  fontSize: 11, color: '#475569', background: 'none', border: 'none',
                  cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4,
                  padding: 0,
                }}
              >
                <span style={{ fontSize: 10 }}>{showNichtFaellig ? '▾' : '▸'}</span>
                Nicht fällig heute ({nichtFaellig.length})
              </button>
              {showNichtFaellig && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {nichtFaellig.map(supp => (
                    <SuppCard
                      key={supp.id}
                      supp={supp}
                      onToggle={toggleHeute}
                      onDelete={handleDelete}
                      dimmed
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── PriorityBadge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const isHoch = priority === 'hoch'
  return (
    <span style={{
      fontSize: 10, fontWeight: 600,
      padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap',
      background: isHoch ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
      color: isHoch ? '#F87171' : '#FCD34D',
      border: `1px solid ${isHoch ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
    }}>
      {isHoch ? 'Hohe Priorität' : 'Mittlere Priorität'}
    </span>
  )
}

// ─── GuideSkeleton ───────────────────────────────────────────────────────────

function GuideSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          ...glass, padding: 20,
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div style={{ height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 8, width: '33%' }} />
            <div style={{ height: 22, background: 'rgba(255,255,255,0.06)', borderRadius: 999, width: 96, flexShrink: 0 }} />
          </div>
          <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 6, width: '100%', marginBottom: 6 }} />
          <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 6, width: '80%', marginBottom: 16 }} />
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '0 0 12px' }} />
          <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 6, width: '60%', marginBottom: 6 }} />
          <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 6, width: '70%', marginBottom: 12 }} />
          <div style={{ height: 36, background: 'rgba(255,255,255,0.06)', borderRadius: 10, width: '100%' }} />
        </div>
      ))}
    </div>
  )
}

// ─── GuideTab ────────────────────────────────────────────────────────────────

function GuideTab({ user, onAddSupplement }) {
  const { location } = useGeolocation()
  const { settings, loading: settingsLoading } = useUserSettings(user.id)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)

  const lat = location?.lat
  const lon = location?.lon

  useEffect(() => {
    if (settingsLoading) return

    const vor14Tagen = new Date()
    vor14Tagen.setDate(vor14Tagen.getDate() - 14)
    const vor14Str = vor14Tagen.toISOString().slice(0, 10)

    const uvPromise = lat != null
      ? fetchUVData(lat, lon)
      : Promise.resolve(null)

    Promise.all([
      uvPromise,
      supabase
        .from('nutrition_log')
        .select('date, items')
        .eq('user_id', user.id)
        .gte('date', vor14Str),
      supabase
        .from('supplements')
        .select('name')
        .eq('user_id', user.id),
    ])
      .then(([uvData, nutritionRes, supplRes]) => {
        const uvArr = uvData?.daily?.uv_index_max ?? []
        const avgUV7 = uvArr.length > 0
          ? +( uvArr.slice(0, 7).reduce((s, v) => s + (v ?? 0), 0) / Math.min(7, uvArr.length) ).toFixed(1)
          : 2

        const goals = settings.ernaehrungsziele ?? DEFAULT_GOALS
        const rows = nutritionRes.data ?? []
        let avgProteinPct = 100, avgKcalPct = 100, avgFatPct = 100

        if (rows.length > 0) {
          const totalsArr = rows.map(r => calcTotals(r.items ?? []))
          const avgKcal    = totalsArr.reduce((s, t) => s + t.kcal,    0) / totalsArr.length
          const avgProtein = totalsArr.reduce((s, t) => s + t.protein, 0) / totalsArr.length
          const avgFat     = totalsArr.reduce((s, t) => s + t.fett,    0) / totalsArr.length
          avgKcalPct    = (avgKcal    / goals.kcal)    * 100
          avgProteinPct = (avgProtein / goals.protein) * 100
          avgFatPct     = (avgFat     / goals.fett)    * 100
        }

        const existingSupps = (supplRes.data ?? []).map(s => s.name)

        const result = analyzeSupplements({
          avgUV7,
          month: new Date().getMonth() + 1,
          ernaehrungsweise: settings.ernaehrungsweise ?? 'keine',
          aktivitaet:       settings.aktivitaet       ?? 'maessig',
          geschlecht:       settings.geschlecht        ?? '',
          avgProteinPct,
          avgKcalPct,
          avgFatPct,
          existingSupps,
        })

        setSuggestions(result)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [settingsLoading, lat, lon, user.id])

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#F1F5F9', margin: 0 }}>Supplement-Guide</h2>
        <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, marginBottom: 0 }}>
          Persönliche Empfehlungen auf Basis deiner Ernährung und Umweltdaten
        </p>
      </div>

      {loading ? (
        <GuideSkeleton />
      ) : suggestions.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05))',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 16, padding: 20,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#34D399', margin: 0 }}>
            Dein aktuelles Profil zeigt keine offensichtlichen Lücken – weiter so!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suggestions.map(s => (
            <div key={s.name} style={{ ...glass, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>{s.name}</span>
                <PriorityBadge priority={s.priority} />
              </div>

              <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 10, marginBottom: 0 }}>{s.reason}</p>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '14px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: 13, color: '#F1F5F9', margin: 0 }}>
                  <span style={{ color: '#94A3B8' }}>Empfohlene Dosis: </span>
                  {s.dosis}
                </p>
                <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
                  <span style={{ fontWeight: 600, color: '#CBD5E1' }}>Hinweis: </span>
                  {s.hinweis}
                </p>
                <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
                  {ZEITPUNKT_LABEL[s.defaultZeitpunkt] ?? s.defaultZeitpunkt}
                  {' · '}
                  {HAEUFIGKEIT_LABEL[s.defaultHaeufigkeit] ?? s.defaultHaeufigkeit}
                </p>
              </div>

              <button
                onClick={() => onAddSupplement(s)}
                style={{
                  width: '100%', marginTop: 14, padding: '10px 16px',
                  fontSize: 13, fontWeight: 600,
                  background: 'transparent',
                  color: '#818CF8',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: 10, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.target.style.background = 'rgba(99,102,241,0.1)'
                  e.target.style.borderColor = 'rgba(99,102,241,0.5)'
                }}
                onMouseLeave={e => {
                  e.target.style.background = 'transparent'
                  e.target.style.borderColor = 'rgba(99,102,241,0.3)'
                }}
              >
                Zu meinen Supplements hinzufügen
              </button>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', marginTop: 24 }}>
        Diese Empfehlungen ersetzen keine medizinische Beratung.
        Bitte sprich mit deinem Arzt bevor du neue Supplements einnimmst.
      </p>
    </div>
  )
}

// ─── Hauptseite ──────────────────────────────────────────────────────────────

export default function Supplements({ user }) {
  const [activeTab, setActiveTab] = useState('supplements')
  const [prefill, setPrefill] = useState(null)

  function handleAddSupplement(suggestion) {
    setPrefill({
      name: suggestion.name,
      dosierung: suggestion.dosis ?? '',
      zeitpunkt: suggestion.defaultZeitpunkt ?? 'morgens',
      haeufigkeit: suggestion.defaultHaeufigkeit ?? 'taeglich',
    })
    setActiveTab('supplements')
  }

  const tabs = [
    { id: 'supplements', label: 'Supplements'      },
    { id: 'guide',       label: 'Supplement-Guide' },
  ]

  return (
    <div style={{ background: '#0F172A', minHeight: '100%' }}>
      <div style={{ padding: '16px 18px 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', margin: 0 }}>Supplements</h1>
        <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, marginBottom: 0 }}>
          Tagesplan und persönlicher Guide
        </p>
      </div>

      <div style={{ padding: '8px 14px 0' }}>
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: '#1E293B', borderRadius: 12, marginBottom: 20,
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, fontSize: 13, fontWeight: 500,
                padding: '8px 12px', borderRadius: 8,
                border: 'none', cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === tab.id
                  ? 'rgba(255,255,255,0.08)'
                  : 'transparent',
                color: activeTab === tab.id ? '#F1F5F9' : '#94A3B8',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 14px 80px' }}>
        {activeTab === 'supplements' && (
          <SupplementTab
            user={user}
            prefill={prefill}
            onPrefillConsumed={() => setPrefill(null)}
          />
        )}

        {activeTab === 'guide' && (
          <GuideTab user={user} onAddSupplement={handleAddSupplement} />
        )}
      </div>
    </div>
  )
}
