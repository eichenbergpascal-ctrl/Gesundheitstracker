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
    <div className="bg-[#E8F0EC] border border-[#2D6A4F] border-opacity-30 rounded-[14px] p-4 mb-5 flex items-center gap-3">
      <div className="text-2xl font-bold text-[#2D6A4F]">{streak}</div>
      <div>
        <p className="text-sm font-semibold text-[#2D6A4F]">
          {streak === 1 ? 'Tag' : 'Tage'} in Folge
        </p>
        <p className="text-xs text-[#6B6B6B]">Alle täglichen Supplements eingenommen</p>
      </div>
    </div>
  )
}

// ─── SuppCard ────────────────────────────────────────────────────────────────

function SuppCard({ supp, onToggle, onDelete, dimmed = false }) {
  return (
    <div
      className={`bg-white rounded-[14px] p-4 border transition-all ${
        supp.heuteGenommen
          ? 'border-blue-200 bg-blue-50'
          : dimmed
          ? 'border-[#E8E6E1] opacity-50'
          : 'border-[#E8E6E1]'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => onToggle(supp)}
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
            supp.heuteGenommen
              ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
              : 'border-[#CFCCC5] hover:border-[#1D4ED8]'
          }`}
        >
          {supp.heuteGenommen && <span className="text-xs">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${supp.heuteGenommen ? 'text-[#1D4ED8]' : 'text-[#1A1A1A]'}`}>
            {supp.name}
          </p>
          <div className="flex gap-3 mt-0.5 flex-wrap">
            {supp.dosierung && (
              <span className="text-xs text-[#6B6B6B]">{supp.dosierung}</span>
            )}
            <span className="text-xs text-[#A8A8A8]">
              {HAEUFIGKEIT_LABEL[supp.haeufigkeit] ?? supp.haeufigkeit}
            </span>
          </div>
          {supp.heuteGenommen && (
            <span className="text-xs text-[#1D4ED8]">Heute genommen</span>
          )}
        </div>
        <button
          onClick={() => onDelete(supp.id)}
          className="text-[#CFCCC5] hover:text-[#991B1B] transition-colors text-xl leading-none"
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
    if (error) {
      setSupplements(previous)
      setToggleError('Supplement konnte nicht aktualisiert werden.')
    }
  }

  async function handleDelete(id) {
    await supabase.from('supplements').delete().eq('id', id)
  }

  const faelligeHeute = supplements.filter(s => s.heuteFaellig)
  const nichtFaellig = supplements.filter(s => !s.heuteFaellig)
  const takenToday = faelligeHeute.filter(s => s.heuteGenommen).length
  const streak = calculateStreak(supplements)

  return (
    <div>
      {toggleError && (
        <div className="mb-4 px-4 py-2.5 rounded-[10px] bg-red-50 border border-red-200 flex items-center justify-between">
          <span className="text-sm text-[#991B1B]">{toggleError}</span>
          <button onClick={() => setToggleError(null)} className="text-[#991B1B] text-lg leading-none ml-3">×</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">Supplements</h2>
          <p className="text-sm text-[#6B6B6B]">{takenToday}/{faelligeHeute.length} heute erledigt</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-[#1D4ED8] text-white text-sm font-medium px-4 py-2 rounded-[10px] hover:bg-[#1e40af] transition-colors"
        >
          + Supplement
        </button>
      </div>

      <StreakCard streak={streak} />

      {faelligeHeute.length > 0 && (
        <div className="bg-white rounded-[14px] p-4 border border-[#E8E6E1] mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#6B6B6B]">Heutige Einnahme</span>
            <span className="text-sm font-bold text-[#1D4ED8]">{takenToday}/{faelligeHeute.length}</span>
          </div>
          <div className="w-full rounded-full h-2" style={{ backgroundColor: '#E8E6E1' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: faelligeHeute.length ? `${(takenToday / faelligeHeute.length) * 100}%` : '0%',
                backgroundColor: '#1D4ED8',
              }}
            />
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-blue-50 border border-blue-200 rounded-[14px] p-5 mb-5 space-y-3"
        >
          <h3 className="text-sm font-semibold text-blue-800">Neues Supplement</h3>
          <div>
            <label className="text-xs text-[#6B6B6B] mb-1 block">Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="z.B. Vitamin D3, Magnesium, Omega-3"
              required
              className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>
          <div>
            <label className="text-xs text-[#6B6B6B] mb-1 block">Dosierung</label>
            <input
              value={form.dosierung}
              onChange={e => setForm(f => ({ ...f, dosierung: e.target.value }))}
              placeholder="z.B. 1000 IE, 400 mg, 2 Kapseln"
              className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B6B6B] mb-1 block">Einnahmezeitpunkt</label>
              <select
                value={form.zeitpunkt}
                onChange={e => setForm(f => ({ ...f, zeitpunkt: e.target.value }))}
                className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="morgens">Morgens</option>
                <option value="mittags">Mittags</option>
                <option value="abends">Abends</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#6B6B6B] mb-1 block">Häufigkeit</label>
              <select
                value={form.haeufigkeit}
                onChange={e => setForm(f => ({ ...f, haeufigkeit: e.target.value }))}
                className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="taeglich">Täglich</option>
                <option value="jeden_2_tag">Jeden 2. Tag</option>
                <option value="woechentlich">Wöchentlich</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#1D4ED8] text-white text-sm font-medium py-2 rounded-[10px] hover:bg-[#1e40af] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Speichern …' : 'Hinzufügen'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] rounded-[10px] border border-[#CFCCC5] bg-white"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {supplements.length === 0 && !showForm ? (
        <div className="text-center py-12 text-[#A8A8A8]">
          <p className="text-sm">Noch keine Supplements eingetragen.</p>
        </div>
      ) : (
        <>
          {faelligeHeute.length > 0 && (
            <div className="space-y-4 mb-4">
              {ZEITPUNKTE.map(zp => {
                const gruppe = faelligeHeute.filter(s => s.zeitpunkt === zp)
                if (gruppe.length === 0) return null
                return (
                  <div key={zp}>
                    <h3 className="text-xs font-semibold text-[#A8A8A8] uppercase tracking-wide mb-2">
                      {ZEITPUNKT_LABEL[zp]}
                    </h3>
                    <div className="space-y-2">
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
                className="text-xs text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors mb-2 flex items-center gap-1"
              >
                <span>{showNichtFaellig ? '▾' : '▸'}</span>
                Nicht fällig heute ({nichtFaellig.length})
              </button>
              {showNichtFaellig && (
                <div className="space-y-2">
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
  const cls = priority === 'hoch'
    ? 'bg-red-50 text-[#991B1B]'
    : 'bg-[#FEF3C7] text-[#92400E]'
  const label = priority === 'hoch' ? 'Hohe Priorität' : 'Mittlere Priorität'
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

// ─── GuideSkeleton ───────────────────────────────────────────────────────────

function GuideSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-[14px] p-5 border border-[#E8E6E1] animate-pulse">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="h-5 bg-[#F2F1EE] rounded w-1/3" />
            <div className="h-6 bg-[#F2F1EE] rounded-full w-28 shrink-0" />
          </div>
          <div className="h-4 bg-[#F2F1EE] rounded w-full mb-1.5" />
          <div className="h-4 bg-[#F2F1EE] rounded w-4/5 mb-4" />
          <div className="border-t border-[#F2F1EE] my-3" />
          <div className="h-4 bg-[#F2F1EE] rounded w-3/5 mb-2" />
          <div className="h-4 bg-[#F2F1EE] rounded w-2/3 mb-3" />
          <div className="h-9 bg-[#F2F1EE] rounded-[10px] w-full" />
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
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[#1A1A1A]">Supplement-Guide</h2>
        <p className="text-sm text-[#6B6B6B]">
          Persönliche Empfehlungen auf Basis deiner Ernährung und Umweltdaten
        </p>
      </div>

      {loading ? (
        <GuideSkeleton />
      ) : suggestions.length === 0 ? (
        <div className="bg-[#E8F0EC] rounded-[14px] p-5 border border-[#2D6A4F] border-opacity-20">
          <p className="text-sm font-semibold text-[#2D6A4F]">
            Dein aktuelles Profil zeigt keine offensichtlichen Lücken – weiter so!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => (
            <div key={s.name} className="bg-white rounded-[14px] p-5 border border-[#E8E6E1]">
              <div className="flex items-start justify-between gap-3">
                <span className="font-bold text-[#1A1A1A]">{s.name}</span>
                <PriorityBadge priority={s.priority} />
              </div>

              <p className="text-sm text-[#6B6B6B] mt-2">{s.reason}</p>

              <div className="border-t border-[#F2F1EE] my-3" />

              <div className="space-y-1.5">
                <p className="text-sm text-[#1A1A1A]">
                  <span className="text-[#6B6B6B]">Empfohlene Dosis: </span>
                  {s.dosis}
                </p>
                <p className="text-sm text-[#6B6B6B]">
                  <span className="font-medium text-[#1A1A1A]">Hinweis: </span>
                  {s.hinweis}
                </p>
                <p className="text-xs text-[#A8A8A8]">
                  {ZEITPUNKT_LABEL[s.defaultZeitpunkt] ?? s.defaultZeitpunkt}
                  {' · '}
                  {HAEUFIGKEIT_LABEL[s.defaultHaeufigkeit] ?? s.defaultHaeufigkeit}
                </p>
              </div>

              <button
                onClick={() => onAddSupplement(s)}
                className="w-full mt-3 py-2 rounded-[10px] border border-[#1D4ED8] text-[#1D4ED8] text-sm hover:bg-blue-50 transition-colors"
              >
                Zu meinen Supplements hinzufügen
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[#A8A8A8] text-center mt-6">
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
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-5xl mx-auto w-full pb-24 md:pb-6">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Supplements</h1>
      <p className="text-[#6B6B6B] text-sm mb-5">Tagesplan und persönlicher Guide</p>

      <div className="flex gap-1 p-1 rounded-[10px] mb-6" style={{ backgroundColor: '#F2F1EE' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-sm font-medium py-2 px-3 rounded-[8px] transition-all ${
              activeTab === tab.id
                ? 'bg-white text-[#1A1A1A] shadow-sm'
                : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
  )
}
