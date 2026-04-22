import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../supabase'
import { useUserSettings } from '../hooks/useUserSettings'
import { ALLERGEN_MAP } from '../services/openMeteo'
import { FOOD_INTOLERANCE_OPTIONS } from '../services/foods'

const ALLERGEN_OPTIONS = Object.entries(ALLERGEN_MAP).map(([id, v]) => ({ id, ...v }))

const AKTIVITAET_OPTIONS = [
  { value: 'wenig',     label: 'Wenig aktiv' },
  { value: 'maessig',  label: 'Mäßig aktiv' },
  { value: 'aktiv',    label: 'Aktiv' },
  { value: 'sehr_aktiv', label: 'Sehr aktiv' },
]

const ERNAEHRUNGSWEISE_OPTIONS = [
  { value: 'keine',       label: 'Keine Einschränkung' },
  { value: 'vegetarisch', label: 'Vegetarisch' },
  { value: 'vegan',       label: 'Vegan' },
  { value: 'low_carb',    label: 'Low-Carb' },
  { value: 'keto',        label: 'Keto' },
  { value: 'paleo',       label: 'Paleo' },
]

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function calcAge(geburtsdatum) {
  if (!geburtsdatum) return null
  const today = new Date()
  const birth = new Date(geburtsdatum)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age >= 0 ? age : null
}

function calcBMI(groesse, gewicht) {
  if (!groesse || !gewicht) return null
  const m = Number(groesse) / 100
  return +(Number(gewicht) / (m * m)).toFixed(1)
}

function bmiInfo(bmi) {
  if (bmi < 18.5) return { label: 'Untergewicht', color: '#B45309' }
  if (bmi < 25)   return { label: 'Normalgewicht', color: '#2D6A4F' }
  if (bmi < 30)   return { label: 'Übergewicht',   color: '#B45309' }
  return               { label: 'Adipositas',       color: '#991B1B' }
}

function calcKalorienbedarf(local) {
  const { geschlecht, geburtsdatum, groesse, gewicht, aktivitaet } = local
  if (!geschlecht || !geburtsdatum || !groesse || !gewicht) return null
  const alter = calcAge(geburtsdatum)
  if (!alter || alter < 1) return null
  const kg = Number(gewicht)
  const cm = Number(groesse)
  let grundumsatz
  if (geschlecht === 'maennlich') {
    grundumsatz = 88.362 + (13.397 * kg) + (4.799 * cm) - (5.677 * alter)
  } else {
    grundumsatz = 447.593 + (9.247 * kg) + (3.098 * cm) - (4.330 * alter)
  }
  const faktoren = { wenig: 1.2, maessig: 1.375, aktiv: 1.55, sehr_aktiv: 1.725 }
  return Math.round(grundumsatz * (faktoren[aktivitaet] ?? 1.375))
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SectionSkeleton() {
  return (
    <div className="bg-white rounded-[14px] p-5 border border-[#E8E6E1] animate-pulse">
      <div className="h-3.5 bg-[#F2F1EE] rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-9 bg-[#F2F1EE] rounded-[10px]" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-9 bg-[#F2F1EE] rounded-[10px]" />
          <div className="h-9 bg-[#F2F1EE] rounded-[10px]" />
        </div>
      </div>
    </div>
  )
}

// ─── Wiederverwendbare Komponenten ───────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-[14px] p-5 border border-[#E8E6E1]">
      <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wide mb-4">
        {title}
      </h2>
      {children}
    </div>
  )
}

function InputField({ label, children }) {
  return (
    <div>
      <label className="text-xs text-[#6B6B6B] mb-1 block">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-white ' +
  'text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]'

// ─── Hauptkomponente ────────────────────────────────────────────────────────

export default function Profil({ user }) {
  const { settings, updateSettings, loading } = useUserSettings(user.id)

  // Lokaler Formular-State (verhindert Supabase-Aufruf bei jedem Tastendruck)
  const [local, setLocal] = useState({
    geschlecht: '', geburtsdatum: '', groesse: '', gewicht: '',
    aktivitaet: 'maessig', ernaehrungsweise: 'keine',
  })
  const [kcalSaved, setKcalSaved] = useState(false)
  const kcalTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(kcalTimerRef.current), [])

  // Einmalig synchronisieren, sobald settings geladen sind
  useEffect(() => {
    if (!loading) {
      setLocal({
        geschlecht: settings.geschlecht ?? '',
        geburtsdatum: settings.geburtsdatum ?? '',
        groesse: settings.groesse != null ? String(settings.groesse) : '',
        gewicht: settings.gewicht != null ? String(settings.gewicht) : '',
        aktivitaet: settings.aktivitaet ?? 'maessig',
        ernaehrungsweise: settings.ernaehrungsweise ?? 'keine',
      })
    }
  }, [loading]) // bewusst nur auf loading-Übergang reagieren

  // Sofort-Speichern für Button-Felder (geschlecht, aktivitaet, ernaehrungsweise)
  function saveNow(updates) {
    setLocal(p => ({ ...p, ...updates }))
    updateSettings(updates)
  }

  // Blur-Speichern für numerische / Datumsfelder
  function saveOnBlur(key, rawValue) {
    const numKeys = ['groesse', 'gewicht']
    const value = numKeys.includes(key)
      ? (rawValue !== '' ? Number(rawValue) : null)
      : (rawValue || null)
    updateSettings({ [key]: value })
  }

  // Allergie-Toggle (identisch zu AllergieRadar)
  function toggleAllergie(id) {
    const next = settings.selectedAllergies.includes(id)
      ? settings.selectedAllergies.filter(a => a !== id)
      : [...settings.selectedAllergies, id]
    updateSettings({ selectedAllergies: next })
  }

  // Unverträglichkeits-Toggle
  function toggleUnvertraeglichkeit(id) {
    const next = settings.foodIntolerances.includes(id)
      ? settings.foodIntolerances.filter(a => a !== id)
      : [...settings.foodIntolerances, id]
    updateSettings({ foodIntolerances: next })
  }

  // Kalorienbedarf als Ernährungsziel übernehmen
  async function handleKcalOvernehmen() {
    if (!kalorienbedarf) return
    await updateSettings({
      ernaehrungsziele: { ...settings.ernaehrungsziele, kcal: kalorienbedarf },
    })
    setKcalSaved(true)
    clearTimeout(kcalTimerRef.current)
    kcalTimerRef.current = setTimeout(() => setKcalSaved(false), 2000)
  }

  // ── Abgeleitete Werte ──────────────────────────────────────────────────────
  const alter = calcAge(local.geburtsdatum)
  const bmi = calcBMI(local.groesse, local.gewicht)
  const bmiMeta = bmi !== null ? bmiInfo(bmi) : null
  const kalorienbedarf = useMemo(() => calcKalorienbedarf(local), [local])

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-4 py-5 md:px-8 md:py-7 max-w-5xl mx-auto w-full space-y-4">
        <div className="h-8 w-32 bg-[#F2F1EE] rounded animate-pulse mb-6" />
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    )
  }

  const initial = (user.email?.[0] ?? '?').toUpperCase()

  return (
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-5xl mx-auto w-full space-y-4">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Profil</h1>
        <p className="text-[#6B6B6B] text-sm mt-1">Persönliche Daten und Einstellungen</p>
      </div>

      {/* ── 1. Account ──────────────────────────────────────────────────── */}
      <SectionCard title="Account">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div
            className="flex items-center justify-center rounded-full shrink-0 text-white text-xl font-bold"
            style={{ width: 56, height: 56, backgroundColor: '#2D6A4F' }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#6B6B6B] truncate">{user.email}</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="mt-2 text-sm text-[#991B1B] border border-[#991B1B] rounded-[10px] px-4 py-1.5 hover:bg-red-50 transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ── 2. Körperdaten ──────────────────────────────────────────────── */}
      <SectionCard title="Körperdaten">
        <div className="grid grid-cols-2 gap-4">

          {/* Geschlecht */}
          <div className="col-span-2">
            <label className="text-xs text-[#6B6B6B] mb-2 block">Geschlecht</label>
            <div className="flex gap-2">
              {[
                { value: 'maennlich', label: 'Männlich' },
                { value: 'weiblich',  label: 'Weiblich' },
                { value: 'divers',    label: 'Divers' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => saveNow({ geschlecht: value })}
                  className={`flex-1 px-4 py-2 text-sm rounded-[10px] transition-all ${
                    local.geschlecht === value
                      ? 'bg-[#2D6A4F] text-white'
                      : 'border border-[#E8E6E1] text-[#6B6B6B] hover:border-[#CFCCC5]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Geburtsdatum */}
          <InputField
            label={
              <>
                Geburtsdatum
                {alter !== null && (
                  <span className="ml-2 text-[#A8A8A8]">({alter} Jahre)</span>
                )}
              </>
            }
          >
            <input
              type="date"
              value={local.geburtsdatum}
              onChange={e => setLocal(p => ({ ...p, geburtsdatum: e.target.value }))}
              onBlur={() => saveOnBlur('geburtsdatum', local.geburtsdatum)}
              className={inputCls}
            />
          </InputField>

          {/* Größe */}
          <InputField label="Größe">
            <div className="relative">
              <input
                type="number"
                value={local.groesse}
                placeholder="175"
                onChange={e => setLocal(p => ({ ...p, groesse: e.target.value }))}
                onBlur={() => saveOnBlur('groesse', local.groesse)}
                className={inputCls + ' pr-10'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A8A8A8] pointer-events-none">
                cm
              </span>
            </div>
          </InputField>

          {/* Gewicht */}
          <InputField label="Gewicht">
            <div className="relative">
              <input
                type="number"
                value={local.gewicht}
                placeholder="70.0"
                step="0.1"
                onChange={e => setLocal(p => ({ ...p, gewicht: e.target.value }))}
                onBlur={() => saveOnBlur('gewicht', local.gewicht)}
                className={inputCls + ' pr-10'}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A8A8A8] pointer-events-none">
                kg
              </span>
            </div>
          </InputField>

          {/* BMI-Anzeige */}
          {bmi !== null && bmiMeta && (
            <div className="col-span-2 rounded-[10px] p-4 text-center bg-[#F8F7F4]">
              <div className="text-2xl font-bold" style={{ color: bmiMeta.color }}>
                {bmi.toFixed(1)}
              </div>
              <div className="text-sm font-semibold mt-0.5" style={{ color: bmiMeta.color }}>
                {bmiMeta.label}
              </div>
              <div className="text-xs text-[#A8A8A8] mt-0.5">Body-Mass-Index</div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── 3. Aktivität & Ernährungsweise ──────────────────────────────── */}
      <SectionCard title="Aktivität & Ernährungsweise">

        {/* Aktivitätslevel */}
        <div className="mb-5">
          <label className="text-xs text-[#6B6B6B] mb-2 block">Aktivitätslevel</label>
          <div className="flex flex-wrap gap-2">
            {AKTIVITAET_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => saveNow({ aktivitaet: value })}
                className={`px-4 py-2 text-sm rounded-[10px] transition-all ${
                  local.aktivitaet === value
                    ? 'bg-[#2D6A4F] text-white'
                    : 'border border-[#E8E6E1] text-[#6B6B6B] hover:border-[#CFCCC5]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Ernährungsweise */}
        <div>
          <label className="text-xs text-[#6B6B6B] mb-2 block">Ernährungsweise</label>
          <div className="grid grid-cols-3 gap-2">
            {ERNAEHRUNGSWEISE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => saveNow({ ernaehrungsweise: value })}
                className={`px-3 py-2 text-sm rounded-[10px] transition-all text-center ${
                  local.ernaehrungsweise === value
                    ? 'bg-[#2D6A4F] text-white'
                    : 'border border-[#E8E6E1] text-[#6B6B6B] hover:border-[#CFCCC5]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── 4. Kalorienbedarf ───────────────────────────────────────────── */}
      <SectionCard title="Kalorienbedarf">
        {kalorienbedarf ? (
          <div className="rounded-[10px] p-4 bg-[#E8F0EC]">
            <div className="text-2xl font-bold text-[#2D6A4F]">
              {kalorienbedarf.toLocaleString('de-DE')}
              <span className="text-sm font-normal text-[#2D6A4F] ml-1">kcal / Tag</span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-1 mb-4">
              Automatisch aus deinen Körperdaten berechnet (Harris-Benedict)
            </p>
            <button
              onClick={handleKcalOvernehmen}
              className={`text-sm font-medium px-4 py-2 rounded-[10px] transition-all ${
                kcalSaved
                  ? 'bg-[#2D6A4F] text-white'
                  : 'border border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#2D6A4F] hover:text-white'
              }`}
            >
              {kcalSaved ? 'Übernommen ✓' : 'Als Ernährungsziel übernehmen'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-[#A8A8A8]">
            Fülle Körperdaten aus, um deinen Kalorienbedarf automatisch zu berechnen.
          </p>
        )}
      </SectionCard>

      {/* ── 5. Lebensmittel-Unverträglichkeiten ─────────────────────────── */}
      <SectionCard title="Lebensmittel-Unverträglichkeiten">
        <p className="text-xs text-[#A8A8A8] mb-3">
          Bei einem Treffer wirst du beim Hinzufügen eines Lebensmittels gewarnt.
        </p>
        <div className="flex flex-wrap gap-2">
          {FOOD_INTOLERANCE_OPTIONS.map(label => {
            const isSelected = settings.foodIntolerances.includes(label)
            return (
              <button
                key={label}
                onClick={() => toggleUnvertraeglichkeit(label)}
                className={`px-3 py-2 rounded-[10px] border-2 text-sm font-medium transition-all ${
                  isSelected
                    ? 'border-[#B45309] text-[#B45309] bg-[#FEF3C7]'
                    : 'border-[#E8E6E1] text-[#6B6B6B] bg-white hover:border-[#CFCCC5]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        {settings.foodIntolerances.length === 0 && (
          <p className="text-xs text-[#A8A8A8] mt-2">
            Wähle deine Unverträglichkeiten, um Warnungen beim Erfassen zu erhalten.
          </p>
        )}
      </SectionCard>

      {/* ── 6. Allergien ────────────────────────────────────────────────── */}
      <SectionCard title="Allergien">
        <p className="text-xs text-[#A8A8A8] mb-3">
          Diese Einstellungen gelten auch für Allergie-Radar und Dashboard.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ALLERGEN_OPTIONS.map(({ id, label, color }) => {
            const isSelected = settings.selectedAllergies.includes(id)
            return (
              <button
                key={id}
                onClick={() => toggleAllergie(id)}
                className={`px-4 py-2.5 rounded-[10px] border-2 text-sm font-medium transition-all text-left ${
                  isSelected
                    ? ''
                    : 'border-[#E8E6E1] text-[#6B6B6B] bg-white hover:border-[#CFCCC5]'
                }`}
                style={isSelected ? { borderColor: color, color, backgroundColor: color + '18' } : {}}
              >
                {label}
              </button>
            )
          })}
        </div>
        {settings.selectedAllergies.length === 0 && (
          <p className="text-xs text-[#A8A8A8] mt-2">
            Wähle deine Allergene, um nur relevante Daten zu sehen.
          </p>
        )}
      </SectionCard>
    </div>
  )
}
