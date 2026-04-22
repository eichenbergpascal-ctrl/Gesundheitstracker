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

  // Supplements
  const nichtGenommen = faelligeHeute.filter(s => !s.heuteGenommen)
  nichtGenommen.forEach(s => {
    const zLabel = ZEITPUNKT_LABELS[s.zeitpunkt_neu] || s.zeitpunkt_neu || ''
    schritte.push({ typ: 'warnung', text: `Noch nicht eingenommen: ${s.name} (${zLabel})` })
  })
  if (faelligeHeute.length > 0 && nichtGenommen.length === 0) {
    schritte.push({ typ: 'positiv', text: 'Alle heutigen Supplements eingenommen.' })
  }

  // Ernährung
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

// ─── Komponenten ────────────────────────────────────────────────────────────

function ScoreCircle({ score, small }) {
  const size = small ? 110 : 140
  const cx = size / 2
  const r = small ? 41 : 52
  const circ = 2 * Math.PI * r
  const fontSize = small ? '22px' : '28px'
  const yScore = cx - 7
  const ySubLabel = cx + 14

  if (score === null) {
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E8E6E1" strokeWidth="10" />
          <text x={cx} y={cx} textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize, fontWeight: '700', fill: '#A8A8A8' }}>
            –
          </text>
        </svg>
        <span className={`font-semibold mt-1 text-center text-[#A8A8A8] ${small ? 'text-sm' : 'text-base'}`}>
          Noch kein Eintrag heute
        </span>
      </div>
    )
  }

  const ringColor = score >= 75 ? '#2D6A4F' : score >= 50 ? '#B45309' : '#991B1B'
  const label = score >= 75 ? 'Gut' : score >= 50 ? 'Mäßig' : 'Schlecht'
  const dash = (score / 100) * circ

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E8E6E1" strokeWidth="10" />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={ringColor} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
        <text x={cx} y={cx} textAnchor="middle" dominantBaseline="middle"
          style={{ fontSize, fontWeight: '700', fill: ringColor }}>
          {score}
        </text>
      </svg>
      <span className={`font-semibold mt-1 ${small ? 'text-base' : 'text-lg'}`} style={{ color: ringColor }}>
        {label}
      </span>
    </div>
  )
}

function StatCard({ title, value, label, labelColor, subtitle }) {
  return (
    <div className="bg-white rounded-[14px] p-5 border border-[#E8E6E1]">
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F2F1EE] ${labelColor}`}>
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-[#1A1A1A]">{value}</div>
      <div className="text-sm text-[#6B6B6B] mt-1">{title}</div>
      {subtitle && <div className="text-xs text-[#A8A8A8] mt-0.5">{subtitle}</div>}
    </div>
  )
}

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-[#F2F1EE] rounded-[10px] ${className}`} />
}

function ProgressBar({ pct, color }) {
  return (
    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#E8E6E1' }}>
      <div
        className="h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
      />
    </div>
  )
}

// ─── Hauptkomponente ────────────────────────────────────────────────────────

export default function Dashboard({ user, setPage }) {
  const { settings } = useUserSettings(user.id)
  const [expanded, setExpanded] = useState(false)
  const [suppError, setSuppError] = useState(null)

  // Ernährung heute
  const [nutritionTotals, setNutritionTotals] = useState(
    { kcal: 0, protein: 0, kohlenhydrate: 0, fett: 0 }
  )
  const [loadingNutrition, setLoadingNutrition] = useState(true)

  // Supplements
  const [supplements, setSupplements] = useState([])
  const [loadingSupplements, setLoadingSupplements] = useState(true)

  // Arzttermine (nächste 7 Tage)
  const [termine, setTermine] = useState([])
  const [loadingTermine, setLoadingTermine] = useState(true)

  const goals = settings.ernaehrungsziele ?? DEFAULT_GOALS

  // ── Daten laden ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    const todayStr = todayKey()
    const plus7 = new Date()
    plus7.setDate(plus7.getDate() + 7)
    const plus7Str = plus7.toISOString().slice(0, 10)

    Promise.all([
      supabase
        .from('nutrition_log')
        .select('items')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle(),
      supabase
        .from('supplements')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at'),
      supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .eq('abgeschlossen', false)
        .gte('datum', todayStr)
        .lte('datum', plus7Str)
        .order('datum')
        .limit(3),
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

  // ── Supplement-Toggle ────────────────────────────────────────────────────
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
    if (error) {
      setSupplements(previous)
      setSuppError('Supplement konnte nicht aktualisiert werden.')
    }
  }

  // ── Abgeleitete Werte ─────────────────────────────────────────────────────
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
  const zeitpunkt = hour < 12 ? 'morgens' : hour < 17 ? 'mittags' : 'abends'
  const zeitpunktLabel = ZEITPUNKT_LABELS[zeitpunkt]
  const faelligJetzt = faelligeHeute.filter(s => s.zeitpunkt_neu === zeitpunkt)
  const genommenJetzt = faelligJetzt.filter(s => s.heuteGenommen)
  const suppHinweis = faelligJetzt.length === 0
    ? `Keine Supplements für ${zeitpunktLabel} geplant.`
    : genommenJetzt.length === faelligJetzt.length
    ? `Alle ${zeitpunktLabel}-Supplements eingenommen.`
    : `${faelligJetzt.length - genommenJetzt.length} ${zeitpunktLabel}-Supplement(s) noch ausstehend.`

  const kalorienRatio = goals.kcal > 0 ? nutritionTotals.kcal / goals.kcal : 0
  const kalorienBarColor = kalorienRatio >= 0.8 && kalorienRatio <= 1.1 ? '#2D6A4F' : '#B45309'
  const kalorienPct = Math.round(kalorienRatio * 100)

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-5xl mx-auto w-full">

      {suppError && (
        <div className="mb-4 px-4 py-2.5 rounded-[10px] bg-red-50 border border-red-200 flex items-center justify-between">
          <span className="text-sm text-[#991B1B]">{suppError}</span>
          <button onClick={() => setSuppError(null)} className="text-[#991B1B] text-lg leading-none ml-3">×</button>
        </div>
      )}

      {/* ── 1. Score Card ─────────────────────────────────────────────────── */}
      <div
        className="bg-white rounded-[14px] border border-[#E8E6E1] mb-5 cursor-pointer transition-all duration-300"
        onClick={() => !scorePending && setExpanded(e => !e)}
      >
        <div className="p-6">
          <div className="flex flex-col items-center">
            <h2 className="text-sm font-semibold text-[#6B6B6B] uppercase tracking-wide mb-1">
              Tages-Gesundheits-Score
            </h2>
            <p className="text-[#A8A8A8] text-xs mb-4">
              {new Date().toLocaleDateString('de-DE', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </p>
          </div>

          {scorePending ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="animate-pulse bg-[#F2F1EE] rounded-full w-[140px] h-[140px]" />
              <div className="animate-pulse bg-[#F2F1EE] rounded-full h-5 w-20" />
            </div>
          ) : expanded ? (
            <div className="w-full">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Linke Spalte: ScoreCircle klein */}
                <div className="flex justify-center w-full md:w-2/5">
                  <ScoreCircle score={gesamtScore} small />
                </div>

                {/* Rechte Spalte: Handlungsschritte */}
                <div className="w-full md:w-3/5">
                  <p className="text-sm font-semibold text-[#1A1A1A] mb-3">Was heute zählt</p>
                  {gesamtScore !== null && gesamtScore >= 90 ? (
                    <p className="text-sm text-[#2D6A4F]">Sehr guter Tag bisher – weiter so!</p>
                  ) : (
                    <ul className="space-y-2">
                      {handlungsschritte.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span
                            className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                s.typ === 'positiv' ? '#2D6A4F'
                                : s.typ === 'warnung' ? '#B45309'
                                : '#A8A8A8',
                            }}
                          />
                          <span style={{
                            color: s.typ === 'positiv' ? '#2D6A4F'
                              : s.typ === 'info' ? '#6B6B6B'
                              : '#1A1A1A',
                          }}>
                            {s.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setExpanded(false) }}
                    className="text-xs text-[#A8A8A8] hover:text-[#6B6B6B] mt-4"
                  >
                    ✕ Schließen
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <ScoreCircle score={gesamtScore} />
              {gesamtScore !== null && gesamtScore < 90 && (
                <p className="text-xs text-[#A8A8A8] mt-3">
                  Tippe für Details & Handlungsschritte
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Schnellübersicht ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-5">

        {/* Card A: Kalorien */}
        <div
          className="bg-white rounded-[14px] p-5 border border-[#E8E6E1] cursor-pointer hover:border-[#CFCCC5] transition-colors"
          onClick={() => setPage('ernaehrung')}
        >
          <div className="mb-3">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F2F1EE] text-[#6B6B6B]">
              Kalorien
            </span>
          </div>
          {loadingNutrition ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <>
              <div className="text-xl font-bold text-[#1A1A1A] leading-tight">
                {nutritionTotals.kcal}
                <span className="text-sm font-normal text-[#A8A8A8]"> / {goals.kcal}</span>
              </div>
              <div className="text-xs text-[#6B6B6B] mb-2">kcal heute</div>
              <ProgressBar pct={kalorienPct} color={kalorienBarColor} />
              <div className="text-xs text-[#A8A8A8] mt-2">
                Protein {Math.round(nutritionTotals.protein)}g / {goals.protein}g
              </div>
            </>
          )}
        </div>

        {/* Card B: Supplements */}
        <div
          className="bg-white rounded-[14px] p-5 border border-[#E8E6E1] cursor-pointer hover:border-[#CFCCC5] transition-colors"
          onClick={() => setPage('supplements')}
        >
          <div className="mb-3">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F2F1EE] text-[#1D4ED8]">
              Supplements
            </span>
          </div>
          {loadingSupplements ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : supplements.length === 0 ? (
            <p className="text-xs text-[#A8A8A8] leading-relaxed">
              Keine Supplements eingetragen
            </p>
          ) : (
            <>
              <div className="text-2xl font-bold text-[#1A1A1A] leading-tight">
                {takenToday}
                <span className="text-sm font-normal text-[#A8A8A8]"> / {faelligeHeute.length}</span>
              </div>
              <div className="text-sm text-[#6B6B6B] mt-1">heute genommen</div>
              <div className="text-xs text-[#A8A8A8] mt-2">{suppHinweis}</div>
            </>
          )}
        </div>
      </div>

      {/* ── 3. Nächste Arzttermine ────────────────────────────────────────── */}
      <div className="bg-white rounded-[14px] p-5 border border-[#E8E6E1] mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Nächste Arzttermine</h3>
          <span className="text-xs text-[#A8A8A8]">7 Tage</span>
        </div>

        {loadingTermine ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-4/5" />
          </div>
        ) : termine.length === 0 ? (
          <p className="text-sm text-[#A8A8A8] py-1">
            Keine Termine in den nächsten 7 Tagen
          </p>
        ) : (
          <div className="space-y-0 mb-3">
            {termine.map((t, idx) => (
              <div
                key={t.id}
                className={`flex items-start gap-3 py-2.5 ${
                  idx < termine.length - 1 ? 'border-b border-[#F2F1EE]' : ''
                }`}
              >
                <span className="text-base leading-none mt-0.5 shrink-0">📅</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1A1A1A] truncate">{t.titel}</p>
                  <p className="text-xs text-[#6B6B6B] mt-0.5">
                    {formatTerminDate(t.datum)}
                    {t.uhrzeit && <span className="ml-2">{t.uhrzeit} Uhr</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {setPage && (
          <button
            onClick={() => setPage('arzttermine')}
            className="text-sm text-[#2D6A4F] font-medium hover:underline mt-1"
          >
            Alle Termine →
          </button>
        )}
      </div>
    </div>
  )
}
