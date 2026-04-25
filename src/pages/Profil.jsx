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
  if (bmi < 18.5) return { label: 'Untergewicht', color: '#F59E0B' }
  if (bmi < 25)   return { label: 'Normalgewicht', color: '#10B981' }
  if (bmi < 30)   return { label: 'Übergewicht',   color: '#F59E0B' }
  return               { label: 'Adipositas',       color: '#EF4444' }
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 20,
}

const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10, color: '#F1F5F9', outline: 'none',
  boxSizing: 'border-box',
}

const sectionLabel = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: '#94A3B8',
  marginBottom: 16, marginTop: 0,
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function SectionSkeleton() {
  return (
    <div style={{ ...glass, background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 6, width: '33%', marginBottom: 16 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 38, background: 'rgba(255,255,255,0.06)', borderRadius: 10 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ height: 38, background: 'rgba(255,255,255,0.06)', borderRadius: 10 }} />
          <div style={{ height: 38, background: 'rgba(255,255,255,0.06)', borderRadius: 10 }} />
        </div>
      </div>
    </div>
  )
}

// ─── Hauptkomponente ────────────────────────────────────────────────────────

export default function Profil({ user }) {
  const { settings, updateSettings, loading } = useUserSettings(user.id)

  const [local, setLocal] = useState({
    geschlecht: '', geburtsdatum: '', groesse: '', gewicht: '',
    aktivitaet: 'maessig', ernaehrungsweise: 'keine',
  })
  const [kcalSaved, setKcalSaved] = useState(false)
  const kcalTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(kcalTimerRef.current), [])

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
  }, [loading])

  function saveNow(updates) {
    setLocal(p => ({ ...p, ...updates }))
    updateSettings(updates)
  }

  function saveOnBlur(key, rawValue) {
    const numKeys = ['groesse', 'gewicht']
    const value = numKeys.includes(key)
      ? (rawValue !== '' ? Number(rawValue) : null)
      : (rawValue || null)
    updateSettings({ [key]: value })
  }

  function toggleAllergie(id) {
    const next = settings.selectedAllergies.includes(id)
      ? settings.selectedAllergies.filter(a => a !== id)
      : [...settings.selectedAllergies, id]
    updateSettings({ selectedAllergies: next })
  }

  function toggleUnvertraeglichkeit(id) {
    const next = settings.foodIntolerances.includes(id)
      ? settings.foodIntolerances.filter(a => a !== id)
      : [...settings.foodIntolerances, id]
    updateSettings({ foodIntolerances: next })
  }

  async function handleKcalOvernehmen() {
    if (!kalorienbedarf) return
    await updateSettings({
      ernaehrungsziele: { ...settings.ernaehrungsziele, kcal: kalorienbedarf },
    })
    setKcalSaved(true)
    clearTimeout(kcalTimerRef.current)
    kcalTimerRef.current = setTimeout(() => setKcalSaved(false), 2000)
  }

  const alter = calcAge(local.geburtsdatum)
  const bmi = calcBMI(local.groesse, local.gewicht)
  const bmiMeta = bmi !== null ? bmiInfo(bmi) : null
  const kalorienbedarf = useMemo(() => calcKalorienbedarf(local), [local])

  const focusInput = e => e.target.style.borderColor = '#10B981'
  const blurInput = e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'

  if (loading) {
    return (
      <div style={{ background: '#0F172A', minHeight: '100%' }}>
        <div style={{ padding: '16px 18px 8px' }}>
          <div style={{ height: 22, background: 'rgba(255,255,255,0.06)', borderRadius: 8, width: 80, marginBottom: 8 }} />
        </div>
        <div style={{ padding: '8px 14px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      </div>
    )
  }

  const initial = (user.email?.[0] ?? '?').toUpperCase()

  const chipActive = {
    background: 'rgba(16,185,129,0.12)',
    border: '1px solid rgba(16,185,129,0.35)',
    color: '#34D399',
  }
  const chipInactive = {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#94A3B8',
  }

  return (
    <div style={{ background: '#0F172A', minHeight: '100%' }}>
      <div style={{ padding: '16px 18px 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', margin: 0 }}>Profil</h1>
        <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, marginBottom: 0 }}>
          Persönliche Daten und Einstellungen
        </p>
      </div>

      <div style={{ padding: '8px 14px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── 1. Account ──────────────────────────────────────────────────── */}
        <div style={glass}>
          <p style={sectionLabel}>Account</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #10B981, #06B6D4)',
              fontSize: 20, fontWeight: 700, color: '#fff',
            }}>
              {initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </p>
              <button
                onClick={() => supabase.auth.signOut()}
                style={{
                  marginTop: 8, fontSize: 12, fontWeight: 500,
                  color: '#F87171', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8, padding: '5px 12px',
                  background: 'transparent', cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.target.style.background = 'rgba(239,68,68,0.08)'}
                onMouseLeave={e => e.target.style.background = 'transparent'}
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Körperdaten ──────────────────────────────────────────────── */}
        <div style={glass}>
          <p style={sectionLabel}>Körperdaten</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* Geschlecht */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 8 }}>Geschlecht</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'maennlich', label: 'Männlich' },
                  { value: 'weiblich',  label: 'Weiblich' },
                  { value: 'divers',    label: 'Divers' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => saveNow({ geschlecht: value })}
                    style={{
                      flex: 1, padding: '9px 8px', fontSize: 13,
                      borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                      ...(local.geschlecht === value ? chipActive : chipInactive),
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Geburtsdatum */}
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 6 }}>
                Geburtsdatum
                {alter !== null && (
                  <span style={{ marginLeft: 6, color: '#475569' }}>({alter} Jahre)</span>
                )}
              </label>
              <input
                type="date"
                value={local.geburtsdatum}
                onChange={e => setLocal(p => ({ ...p, geburtsdatum: e.target.value }))}
                onBlur={() => saveOnBlur('geburtsdatum', local.geburtsdatum)}
                style={inputStyle}
                onFocus={focusInput}
              />
            </div>

            {/* Größe */}
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 6 }}>Größe</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  value={local.groesse}
                  placeholder="175"
                  onChange={e => setLocal(p => ({ ...p, groesse: e.target.value }))}
                  onBlur={() => saveOnBlur('groesse', local.groesse)}
                  style={{ ...inputStyle, paddingRight: 36 }}
                  onFocus={focusInput}
                />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#475569', pointerEvents: 'none' }}>cm</span>
              </div>
            </div>

            {/* Gewicht */}
            <div>
              <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 6 }}>Gewicht</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  value={local.gewicht}
                  placeholder="70.0"
                  step="0.1"
                  onChange={e => setLocal(p => ({ ...p, gewicht: e.target.value }))}
                  onBlur={() => saveOnBlur('gewicht', local.gewicht)}
                  style={{ ...inputStyle, paddingRight: 36 }}
                  onFocus={focusInput}
                />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#475569', pointerEvents: 'none' }}>kg</span>
              </div>
            </div>

            {/* BMI */}
            {bmi !== null && bmiMeta && (
              <div style={{
                gridColumn: '1 / -1',
                background: `${bmiMeta.color}12`,
                border: `1px solid ${bmiMeta.color}30`,
                borderRadius: 12, padding: '14px 16px', textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 28, fontWeight: 700, color: bmiMeta.color, lineHeight: 1,
                }}>
                  {bmi.toFixed(1)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: bmiMeta.color, marginTop: 4 }}>
                  {bmiMeta.label}
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Body-Mass-Index</div>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Aktivität & Ernährungsweise ──────────────────────────────── */}
        <div style={glass}>
          <p style={sectionLabel}>Aktivität &amp; Ernährungsweise</p>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 8 }}>Aktivitätslevel</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {AKTIVITAET_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => saveNow({ aktivitaet: value })}
                  style={{
                    padding: '8px 14px', fontSize: 13, borderRadius: 10,
                    cursor: 'pointer', transition: 'all 0.2s',
                    ...(local.aktivitaet === value ? chipActive : chipInactive),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 8 }}>Ernährungsweise</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {ERNAEHRUNGSWEISE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => saveNow({ ernaehrungsweise: value })}
                  style={{
                    padding: '8px 6px', fontSize: 12, borderRadius: 10,
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                    ...(local.ernaehrungsweise === value ? chipActive : chipInactive),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 4. Kalorienbedarf ───────────────────────────────────────────── */}
        <div style={glass}>
          <p style={sectionLabel}>Kalorienbedarf</p>
          {kalorienbedarf ? (
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.06))',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 12, padding: '16px',
            }}>
              <div style={{ lineHeight: 1 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 28, fontWeight: 700, color: '#F1F5F9',
                }}>
                  {kalorienbedarf.toLocaleString('de-DE')}
                </span>
                <span style={{ fontSize: 13, color: '#94A3B8', marginLeft: 6 }}>kcal / Tag</span>
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, marginBottom: 16 }}>
                Automatisch aus deinen Körperdaten berechnet (Harris-Benedict)
              </p>
              <button
                onClick={handleKcalOvernehmen}
                style={{
                  fontSize: 12, fontWeight: 600, padding: '8px 14px', borderRadius: 10,
                  cursor: 'pointer', transition: 'all 0.2s',
                  ...(kcalSaved
                    ? { background: 'linear-gradient(135deg, #10B981, #06B6D4)', color: '#fff', border: 'none' }
                    : { background: 'transparent', color: '#34D399', border: '1px solid rgba(16,185,129,0.35)' }
                  ),
                }}
              >
                {kcalSaved ? 'Übernommen' : 'Als Ernährungsziel übernehmen'}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
              Fülle Körperdaten aus, um deinen Kalorienbedarf automatisch zu berechnen.
            </p>
          )}
        </div>

        {/* ── 5. Lebensmittel-Unverträglichkeiten ─────────────────────────── */}
        <div style={glass}>
          <p style={sectionLabel}>Lebensmittel-Unverträglichkeiten</p>
          <p style={{ fontSize: 11, color: '#475569', marginBottom: 12, marginTop: 0 }}>
            Bei einem Treffer wirst du beim Hinzufügen eines Lebensmittels gewarnt.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FOOD_INTOLERANCE_OPTIONS.map(label => {
              const isSelected = settings.foodIntolerances.includes(label)
              return (
                <button
                  key={label}
                  onClick={() => toggleUnvertraeglichkeit(label)}
                  style={{
                    padding: '7px 12px', fontSize: 12, fontWeight: 500,
                    borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                    ...(isSelected
                      ? { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: '#FCD34D' }
                      : chipInactive
                    ),
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {settings.foodIntolerances.length === 0 && (
            <p style={{ fontSize: 11, color: '#475569', marginTop: 8, marginBottom: 0 }}>
              Wähle deine Unverträglichkeiten, um Warnungen beim Erfassen zu erhalten.
            </p>
          )}
        </div>

        {/* ── 6. Allergien ────────────────────────────────────────────────── */}
        <div style={glass}>
          <p style={sectionLabel}>Allergien</p>
          <p style={{ fontSize: 11, color: '#475569', marginBottom: 12, marginTop: 0 }}>
            Diese Einstellungen gelten auch für Allergie-Radar und Dashboard.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ALLERGEN_OPTIONS.map(({ id, label, color }) => {
              const isSelected = settings.selectedAllergies.includes(id)
              return (
                <button
                  key={id}
                  onClick={() => toggleAllergie(id)}
                  style={{
                    padding: '9px 12px', fontSize: 12, fontWeight: 500,
                    borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s',
                    ...(isSelected
                      ? { background: color + '18', border: `1px solid ${color}40`, color }
                      : chipInactive
                    ),
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {settings.selectedAllergies.length === 0 && (
            <p style={{ fontSize: 11, color: '#475569', marginTop: 8, marginBottom: 0 }}>
              Wähle deine Allergene, um nur relevante Daten zu sehen.
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
