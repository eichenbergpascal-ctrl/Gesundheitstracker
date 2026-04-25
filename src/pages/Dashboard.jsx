import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useUserSettings } from '../hooks/useUserSettings'
import { calcTotals, todayKey, DEFAULT_GOALS } from '../utils/ernaehrung'

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function formatTerminDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function suppIsHeuteFaellig(s) {
  const haeufigkeit = s.haeufigkeit ?? 'taeglich'
  if (haeufigkeit === 'taeglich') return true
  const todayDate = new Date()
  const createdDate = new Date(s.created_at)
  const diffDays = Math.round((todayDate - createdDate) / 86400000)
  if (haeufigkeit === 'jeden_2_tag') return diffDays % 2 === 0
  if (haeufigkeit === 'woechentlich') return todayDate.getDay() === createdDate.getDay()
  return true
}

function mapSupplement(s) {
  const todayStr = new Date().toISOString().slice(0, 10)
  return {
    ...s,
    heuteGenommen: s.letztes_nehmen ? s.letztes_nehmen.startsWith(todayStr) : false,
    heuteFaellig: suppIsHeuteFaellig(s),
  }
}

function calcMakroScore(totals, goals) {
  if (!totals || totals.kcal === 0) return null

  const kcalRatio = goals.kcal > 0 ? totals.kcal / goals.kcal : 0
  let kcalTeil
  if (kcalRatio >= 0.8 && kcalRatio <= 1.1) kcalTeil = 100
  else if ((kcalRatio >= 0.6 && kcalRatio < 0.8) || (kcalRatio > 1.1 && kcalRatio <= 1.3)) kcalTeil = 65
  else kcalTeil = 30

  const proteinRatio = goals.protein > 0 ? totals.protein / goals.protein : 0
  let proteinTeil
  if (proteinRatio >= 0.9) proteinTeil = 100
  else if (proteinRatio >= 0.7) proteinTeil = 70
  else if (proteinRatio >= 0.5) proteinTeil = 45
  else proteinTeil = 20

  const fettRatio = goals.fett > 0 ? totals.fett / goals.fett : 0
  const fettTeil = fettRatio >= 0.7 && fettRatio <= 1.2 ? 100 : 60

  return kcalTeil * 0.5 + proteinTeil * 0.35 + fettTeil * 0.15
}

function calcTagesScore(suppScore, suppHatEintraege, makroScore) {
  if (makroScore === null && !suppHatEintraege) return null
  if (makroScore === null) return Math.round(suppScore)
  if (!suppHatEintraege) return Math.round(makroScore)
  return Math.round(suppScore * 0.5 + makroScore * 0.5)
}

const ZEITPUNKT_LABELS = { morgens: 'Morgens', mittags: 'Mittags', abends: 'Abends' }

function generateHandlungsschritte({ faelligeHeute, nutritionTotals, goals }) {
  const schritte = []

  const nichtGenommen = faelligeHeute.filter(s => !s.heuteGenommen)
  nichtGenommen.forEach(s => {
    const zLabel = ZEITPUNKT_LABELS[s.zeitpunkt_neu] || s.zeitpunkt_neu || ''
    schritte.push({ typ: 'warnung', text: `Noch nicht eingenommen: ${s.name} (${zLabel})` })
  })
  if (faelligeHeute.length > 0 && nichtGenommen.length === 0) {
    schritte.push({ typ: 'positiv', text: 'Alle heutigen Supplements eingenommen.' })
  }

  if (nutritionTotals.kcal === 0) {
    schritte.push({
      typ: 'info',
      text: 'Noch keine Mahlzeiten erfasst – trage dein Essen im Ernährungs-Check ein.',
    })
  } else {
    const proteinRatio = goals.protein > 0 ? nutritionTotals.protein / goals.protein : 1
    const kcalRatio = goals.kcal > 0 ? nutritionTotals.kcal / goals.kcal : 0

    if (proteinRatio < 0.7) {
      const diff = Math.round(goals.protein - nutritionTotals.protein)
      schritte.push({
        typ: 'warnung',
        text: `Protein heute bei ${Math.round(nutritionTotals.protein)}g / ${goals.protein}g – noch ${diff}g bis zum Tagesziel.`,
      })
    }
    if (kcalRatio < 0.7) {
      schritte.push({
        typ: 'warnung',
        text: `Kalorienzufuhr niedrig: ${nutritionTotals.kcal} / ${goals.kcal} kcal heute.`,
      })
    } else if (kcalRatio > 1.2) {
      const overshootPct = Math.round((kcalRatio - 1) * 100)
      schritte.push({
        typ: 'warnung',
        text: `Kalorienziel um ${overshootPct}% überschritten (${nutritionTotals.kcal} / ${goals.kcal} kcal).`,
      })
    }
    if (proteinRatio >= 0.9 && kcalRatio >= 0.8 && kcalRatio <= 1.1) {
      schritte.push({ typ: 'positiv', text: 'Kalorien und Protein heute gut im Zielbereich.' })
    }
  }

  const warnungen = schritte.filter(s => s.typ === 'warnung')
  const positiv = schritte.filter(s => s.typ === 'positiv')
  const info = schritte.filter(s => s.typ === 'info')
  return [...warnungen, ...positiv, ...info].slice(0, 5)
}

// ─── Score Ring ─────────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const size = 150
  const sw = 11
  const r = (size - sw) / 2
  const cx = size / 2
  const circ = 2 * Math.PI * r

  if (score === null) {
    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 700, color: '#475569', lineHeight: 1 }}>–</span>
          <span style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Noch kein Eintrag</span>
        </div>
      </div>
    )
  }

  const dash = (score / 100) * circ
  const gradId = 'dashScoreGrad'
  const isGood = score >= 75
  const isMed = score >= 50

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isGood ? '#10B981' : isMed ? '#F59E0B' : '#EF4444'} />
            <stop offset="100%" stopColor={isGood ? '#06B6D4' : isMed ? '#D97706' : '#F97066'} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={`url(#${gradId})`} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 38, fontWeight: 700, color: '#F1F5F9', lineHeight: 1,
        }}>{score}</span>
        <span style={{
          fontSize: 12, fontWeight: 600, marginTop: 3,
          color: isGood ? '#10B981' : isMed ? '#F59E0B' : '#EF4444',
        }}>
          {isGood ? 'Gut' : isMed ? 'Mäßig' : 'Niedrig'}
        </span>
      </div>
    </div>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton({ style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 10,
      animation: 'pulse 2s infinite', ...style,
    }} />
  )
}

// ─── ProgressBar ────────────────────────────────────────────────────────────

function ProgressBar({ pct, gradient }) {
  return (
    <div style={{ width: '100%', height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 999,
        width: `${Math.min(100, pct)}%`,
        background: gradient || 'linear-gradient(90deg, #10B981, #06B6D4)',
        transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
      }} />
    </div>
  )
}

// ─── Hauptkomponente ────────────────────────────────────────────────────────

const glassCard = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 16,
  position: 'relative',
  overflow: 'hidden',
}

export default function Dashboard({ user, setPage }) {
  const { settings } = useUserSettings(user.id)
  const [suppError, setSuppError] = useState(null)

  const [nutritionTotals, setNutritionTotals] = useState({ kcal: 0, protein: 0, kohlenhydrate: 0, fett: 0 })
  const [loadingNutrition, setLoadingNutrition] = useState(true)
  const [supplements, setSupplements] = useState([])
  const [loadingSupplements, setLoadingSupplements] = useState(true)
  const [termine, setTermine] = useState([])
  const [loadingTermine, setLoadingTermine] = useState(true)

  const goals = settings.ernaehrungsziele ?? DEFAULT_GOALS

  useEffect(() => {
    if (!user?.id) return
    const todayStr = todayKey()
    const plus7 = new Date()
    plus7.setDate(plus7.getDate() + 7)
    const plus7Str = plus7.toISOString().slice(0, 10)

    Promise.all([
      supabase.from('nutrition_log').select('items').eq('user_id', user.id).eq('date', todayStr).maybeSingle(),
      supabase.from('supplements').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('appointments').select('*').eq('user_id', user.id).eq('abgeschlossen', false)
        .gte('datum', todayStr).lte('datum', plus7Str).order('datum').limit(3),
    ])
      .then(([nutritionRes, supplRes, termineRes]) => {
        setNutritionTotals(calcTotals(nutritionRes.data?.items ?? []))
        setLoadingNutrition(false)
        setSupplements((supplRes.data ?? []).map(mapSupplement))
        setLoadingSupplements(false)
        setTermine(termineRes.data ?? [])
        setLoadingTermine(false)
      })
      .catch(() => {
        setLoadingNutrition(false)
        setLoadingSupplements(false)
        setLoadingTermine(false)
      })
  }, [user.id])

  async function toggleSupplement(supp) {
    const taken = !supp.heuteGenommen
    const previous = supplements
    setSupplements(prev =>
      prev.map(s =>
        s.id === supp.id
          ? { ...s, heuteGenommen: taken, letztes_nehmen: taken ? new Date().toISOString() : null }
          : s
      )
    )
    const { error } = await supabase
      .from('supplements')
      .update({ letztes_nehmen: taken ? new Date().toISOString() : null })
      .eq('id', supp.id)
      .eq('user_id', user.id)
    if (error) {
      setSupplements(previous)
      setSuppError('Supplement konnte nicht aktualisiert werden.')
    }
  }

  const faelligeHeute = supplements.filter(s => s.heuteFaellig)
  const takenToday = faelligeHeute.filter(s => s.heuteGenommen).length
  const suppHatEintraege = faelligeHeute.length > 0
  const suppScore = suppHatEintraege ? (takenToday / faelligeHeute.length) * 100 : 0

  const makroScore = calcMakroScore(nutritionTotals, goals)
  const scorePending = loadingNutrition || loadingSupplements
  const gesamtScore = scorePending ? null : calcTagesScore(suppScore, suppHatEintraege, makroScore)

  const handlungsschritte = scorePending
    ? []
    : generateHandlungsschritte({ faelligeHeute, nutritionTotals, goals })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 17 ? 'Guten Tag' : 'Guten Abend'
  const userName = user.email?.split('@')[0] ?? ''

  const kalorienRatio = goals.kcal > 0 ? nutritionTotals.kcal / goals.kcal : 0
  const kalorienGrad = kalorienRatio <= 1.1 ? 'linear-gradient(90deg, #10B981, #06B6D4)' : 'linear-gradient(90deg, #F59E0B, #F97066)'
  const kalorienPct = Math.round(kalorienRatio * 100)

  const suppGrad = 'linear-gradient(90deg, #6366F1, #8B5CF6)'

  const ernScore = makroScore !== null ? Math.round(makroScore) : null
  const suppDisplayScore = suppHatEintraege ? Math.round(suppScore) : null

  return (
    <div style={{ minHeight: '100%', background: '#0F172A', paddingBottom: 80 }}>

      {suppError && (
        <div style={{
          margin: '8px 14px 0', padding: '10px 14px', borderRadius: 10,
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 13, color: '#EF4444' }}>{suppError}</span>
          <button onClick={() => setSuppError(null)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(180deg, #0F172A 0%, #0D2137 50%, #0F172A 100%)',
        padding: '16px 18px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient glows */}
        <div style={{
          position: 'absolute', top: -60, right: -40, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 40, left: -60, width: 160, height: 160,
          background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        {/* Greeting */}
        <div style={{ position: 'relative', marginBottom: 4 }}>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            {greeting}{userName ? `, ${userName}` : ''}
          </p>
          <p style={{ fontSize: 11, color: '#334155', margin: '2px 0 0' }}>
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Score Hero */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '16px 0 8px', position: 'relative',
        }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#94A3B8', marginBottom: 12,
          }}>
            Tages-Score
          </p>

          {scorePending ? (
            <div style={{
              width: 150, height: 150, borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)', animation: 'pulse 2s infinite',
            }} />
          ) : (
            <ScoreRing score={gesamtScore} />
          )}

          {/* Sub-scores */}
          <div style={{ display: 'flex', gap: 28, marginTop: 16 }}>
            {[
              { label: 'Ernährung', val: ernScore, color: '#10B981' },
              { label: 'Supplements', val: suppDisplayScore, color: '#6366F1' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 18, fontWeight: 700, color: s.color,
                }}>
                  {s.val !== null ? s.val : '–'}
                </div>
                <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cards ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 14px' }}>

        {/* Kalorien + Supplements 2-col */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: -4 }}>

          {/* Kalorien */}
          <div
            style={{ ...glassCard, cursor: 'pointer' }}
            onClick={() => setPage('ernaehrung')}
          >
            <div style={{
              position: 'absolute', top: -20, right: -20, width: 60, height: 60,
              background: 'radial-gradient(circle, rgba(16,185,129,0.15), transparent)',
              borderRadius: '50%',
            }} />
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
              background: 'rgba(16,185,129,0.15)', color: '#10B981',
              marginBottom: 10,
            }}>Kalorien</span>

            {loadingNutrition ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton style={{ height: 28, width: '100%' }} />
                <Skeleton style={{ height: 6, width: '100%' }} />
                <Skeleton style={{ height: 14, width: '75%' }} />
              </div>
            ) : (
              <>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: '#F1F5F9' }}>
                  {nutritionTotals.kcal}
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, marginBottom: 8 }}>
                  / {goals.kcal} kcal
                </div>
                <ProgressBar pct={kalorienPct} gradient={kalorienGrad} />
                <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>
                  Protein {Math.round(nutritionTotals.protein)}g / {goals.protein}g
                </div>
              </>
            )}
          </div>

          {/* Supplements */}
          <div
            style={{ ...glassCard, cursor: 'pointer' }}
            onClick={() => setPage('supplements')}
          >
            <div style={{
              position: 'absolute', top: -20, right: -20, width: 60, height: 60,
              background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent)',
              borderRadius: '50%',
            }} />
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
              background: 'rgba(99,102,241,0.15)', color: '#6366F1',
              marginBottom: 10,
            }}>Supplements</span>

            {loadingSupplements ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton style={{ height: 28, width: '100%' }} />
                <Skeleton style={{ height: 14, width: '75%' }} />
                <Skeleton style={{ height: 14, width: '50%' }} />
              </div>
            ) : supplements.length === 0 ? (
              <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>Keine Supplements eingetragen</p>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: '#F1F5F9' }}>
                    {takenToday}
                  </span>
                  <span style={{ fontSize: 13, color: '#94A3B8' }}>/ {faelligeHeute.length}</span>
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2, marginBottom: 8 }}>heute genommen</div>
                <ProgressBar pct={faelligeHeute.length > 0 ? (takenToday / faelligeHeute.length) * 100 : 0} gradient={suppGrad} />
                {faelligeHeute.length > takenToday && (
                  <div style={{ fontSize: 10, color: '#F59E0B', marginTop: 6 }}>
                    {faelligeHeute.length - takenToday} Supplement(s) ausstehend
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Supplement Checklist */}
        {!loadingSupplements && faelligeHeute.length > 0 && (
          <div style={{ ...glassCard, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Heutige Einnahme</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                background: 'rgba(99,102,241,0.15)', color: '#6366F1',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {takenToday}/{faelligeHeute.length}
              </span>
            </div>
            {faelligeHeute.map((s, i) => (
              <div
                key={s.id}
                onClick={() => toggleSupplement(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0', cursor: 'pointer',
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  border: s.heuteGenommen ? 'none' : '2px solid #334155',
                  background: s.heuteGenommen ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(.175,.885,.32,1.275)',
                  transform: s.heuteGenommen ? 'scale(1)' : 'scale(0.9)',
                  boxShadow: s.heuteGenommen ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                }}>
                  {s.heuteGenommen && <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color: s.heuteGenommen ? '#6366F1' : '#F1F5F9',
                    textDecoration: s.heuteGenommen ? 'line-through' : 'none',
                    transition: 'all 0.2s ease',
                  }}>{s.name}</span>
                  {s.dosis && (
                    <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 6 }}>{s.dosis}</span>
                  )}
                </div>
                <span style={{ fontSize: 10, color: '#94A3B8' }}>
                  {ZEITPUNKT_LABELS[s.zeitpunkt_neu] || ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Nächste Arzttermine */}
        <div style={{ ...glassCard, marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Nächste Arzttermine</span>
            <span style={{ fontSize: 10, color: '#94A3B8' }}>7 Tage</span>
          </div>

          {loadingTermine ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton style={{ height: 44, width: '100%' }} />
              <Skeleton style={{ height: 44, width: '80%' }} />
            </div>
          ) : termine.length === 0 ? (
            <p style={{ fontSize: 13, color: '#475569' }}>Keine Termine in den nächsten 7 Tagen</p>
          ) : (
            <div>
              {termine.map((t, idx) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex', gap: 12, padding: '10px 0',
                    borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: 'rgba(6,182,212,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }} className="truncate">{t.titel}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {formatTerminDate(t.datum)}
                      {t.uhrzeit && <span style={{ marginLeft: 8 }}>{t.uhrzeit} Uhr</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {setPage && (
            <button
              onClick={() => setPage('arzttermine')}
              style={{
                fontSize: 12, color: '#10B981', background: 'none', border: 'none',
                cursor: 'pointer', marginTop: 8, padding: 0,
              }}
            >
              Alle Termine →
            </button>
          )}
        </div>

        {/* Was heute zählt */}
        {!scorePending && handlungsschritte.length > 0 && (
          <div style={{ ...glassCard, marginTop: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9', display: 'block', marginBottom: 10 }}>
              Was heute zählt
            </span>
            {handlungsschritte.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                marginTop: i > 0 ? 8 : 0,
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                  background: s.typ === 'positiv' ? '#10B981' : s.typ === 'info' ? '#06B6D4' : '#F59E0B',
                }} />
                <span style={{
                  fontSize: 12, lineHeight: 1.5,
                  color: s.typ === 'positiv' ? '#10B981' : s.typ === 'info' ? '#94A3B8' : '#F1F5F9',
                }}>{s.text}</span>
              </div>
            ))}
          </div>
        )}
        {!scorePending && gesamtScore !== null && gesamtScore >= 90 && (
          <div style={{ ...glassCard, marginTop: 10, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#10B981', margin: 0 }}>Sehr guter Tag bisher – weiter so!</p>
          </div>
        )}
      </div>
    </div>
  )
}
