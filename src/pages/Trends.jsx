import { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ReferenceLine, Legend, Cell,
} from 'recharts'
import { useGeolocation } from '../hooks/useGeolocation'
import { useUserSettings } from '../hooks/useUserSettings'
import {
  fetchAirQualityData, fetchUVData,
  getDailyMaxValues, calculateHealthScore, ALLERGEN_MAP,
} from '../services/openMeteo'
import {
  fetchNutritionHistory,
  upsertDailyHealthLog,
  fetchHealthScoreHistory,
} from '../services/healthHistory'

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function formatShortDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  const wd = d.toLocaleDateString('de-DE', { weekday: 'short' })
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${wd}, ${day}.${month}.`
}

function scoreColor(score) {
  if (score == null) return '#475569'
  if (score >= 75) return '#10B981'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

function buildTimeline(days, fillFn) {
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    result.push(fillFn(key))
  }
  return result
}

const glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 20,
}

// ─── Custom Tooltips ────────────────────────────────────────────────────────

const tooltipStyle = {
  background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10, padding: 12, fontSize: 13,
}

function NutritionKcalTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle}>
      <p style={{ fontWeight: 600, color: '#F1F5F9', marginBottom: 4, marginTop: 0 }}>{formatShortDate(label)}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: '#94A3B8', margin: '2px 0' }}>
          {p.name}:{' '}
          <span style={{ fontWeight: 600, color: p.color }}>
            {p.value != null ? `${Math.round(p.value)} kcal` : '–'}
          </span>
        </p>
      ))}
    </div>
  )
}

function MacroTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={tooltipStyle}>
      <p style={{ fontWeight: 600, color: '#F1F5F9', marginBottom: 4, marginTop: 0 }}>{formatShortDate(label)}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: '#94A3B8', margin: '2px 0' }}>
          {p.name}:{' '}
          <span style={{ fontWeight: 600, color: p.color }}>
            {p.value != null ? `${Math.round(p.value)} g` : '–'}
          </span>
        </p>
      ))}
    </div>
  )
}

function ScoreTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const score = payload[0]?.value
  return (
    <div style={tooltipStyle}>
      <p style={{ fontWeight: 600, color: '#F1F5F9', marginBottom: 4, marginTop: 0 }}>{formatShortDate(label)}</p>
      <p style={{ color: '#94A3B8', margin: 0 }}>
        Score:{' '}
        <span style={{ fontWeight: 600, color: scoreColor(score) }}>
          {score ?? '–'}
        </span>
      </p>
    </div>
  )
}

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={tooltipStyle}>
      <p style={{ fontWeight: 600, color: '#F1F5F9', marginBottom: 4, marginTop: 0 }}>{formatShortDate(label)}</p>
      <p style={{ color: '#94A3B8', margin: '2px 0' }}>
        Score:{' '}
        <span style={{ fontWeight: 600, color: scoreColor(d?.score) }}>
          {d?.score ?? '–'}
        </span>
      </p>
      <p style={{ color: '#94A3B8', margin: '2px 0' }}>
        AQI: <span style={{ fontWeight: 600, color: '#F1F5F9' }}>{d?.aqi ?? '–'}</span>
      </p>
      <p style={{ color: '#94A3B8', margin: '2px 0' }}>
        UV-Index:{' '}
        <span style={{ fontWeight: 600, color: '#F1F5F9' }}>
          {d?.uvMax != null ? d.uvMax.toFixed(1) : '–'}
        </span>
      </p>
    </div>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function ChartSkeleton({ height = 200 }) {
  return (
    <div style={{
      height, borderRadius: 10, width: '100%',
      background: 'rgba(255,255,255,0.04)',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    }} />
  )
}

// ─── Hauptkomponente ────────────────────────────────────────────────────────

export default function Trends({ user }) {
  const { location } = useGeolocation()
  const { settings } = useUserSettings(user.id)

  const [nutritionHistory, setNutritionHistory] = useState([])
  const [healthHistory, setHealthHistory] = useState([])
  const [forecastData, setForecastData] = useState([])

  const [loadingNutrition, setLoadingNutrition] = useState(true)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [loadingForecast, setLoadingForecast] = useState(true)

  const [nutritionError, setNutritionError] = useState(null)
  const [healthError, setHealthError] = useState(null)
  const [forecastError, setForecastError] = useState(null)

  // Ernährungs-Verlauf laden
  useEffect(() => {
    if (!user?.id) return
    fetchNutritionHistory(user.id, 14)
      .then(data => {
        setNutritionHistory(data)
        setLoadingNutrition(false)
      })
      .catch(e => {
        setNutritionError(e.message)
        setLoadingNutrition(false)
      })
  }, [user.id])

  // Gesundheits-Score-Verlauf laden
  useEffect(() => {
    if (!user?.id) return
    fetchHealthScoreHistory(user.id, 14)
      .then(data => {
        setHealthHistory(data)
        setLoadingHealth(false)
      })
      .catch(e => {
        setHealthError(e.message)
        setLoadingHealth(false)
      })
  }, [user.id])

  // Forecast laden + heute auto-speichern
  useEffect(() => {
    if (!location || !user?.id) return
    setLoadingForecast(true)

    Promise.all([
      fetchAirQualityData(location.lat, location.lon),
      fetchUVData(location.lat, location.lon),
    ])
      .then(([aqiData, uvData]) => {
        const dailyAQI = getDailyMaxValues(aqiData.hourly, 'european_aqi')

        const dailyPollen = {}
        Object.entries(ALLERGEN_MAP).forEach(([id, { key }]) => {
          dailyPollen[id] = getDailyMaxValues(aqiData.hourly, key)
        })

        const forecast = (uvData.daily?.time ?? []).map((date, i) => {
          const aqi = dailyAQI[date] ?? 0
          const uvMax = uvData.daily.uv_index_max?.[i] ?? 0

          const pollenValues = {}
          Object.keys(ALLERGEN_MAP).forEach(id => {
            pollenValues[id] = dailyPollen[id]?.[date] ?? 0
          })

          const score = calculateHealthScore(
            aqi,
            uvMax,
            pollenValues,
            settings.selectedAllergies
          )
          return { date, score, aqi: Math.round(aqi), uvMax }
        })

        setForecastData(forecast)
        setLoadingForecast(false)

        if (forecast.length > 0) {
          const today = forecast[0]
          upsertDailyHealthLog(user.id, today.date, {
            health_score: today.score,
            aqi: today.aqi,
            uv_max: today.uvMax,
          }).catch(() => {})
        }
      })
      .catch(e => {
        setForecastError(e.message)
        setLoadingForecast(false)
      })
  }, [location, user.id, settings.selectedAllergies])

  // ─── Daten aufbereiten ────────────────────────────────────────────────────

  const goals = settings.ernaehrungsziele ?? {
    kcal: 2000, protein: 150, kohlenhydrate: 250, fett: 65,
  }

  const nutritionMap = useMemo(() => {
    const m = {}
    nutritionHistory.forEach(d => { m[d.date] = d })
    return m
  }, [nutritionHistory])

  const nutritionTimeline = useMemo(
    () =>
      buildTimeline(14, key => ({
        date: key,
        kcal: nutritionMap[key]?.kcal ?? null,
        protein: nutritionMap[key]?.protein ?? null,
        kohlenhydrate: nutritionMap[key]?.kohlenhydrate ?? null,
        fett: nutritionMap[key]?.fett ?? null,
      })),
    [nutritionMap]
  )

  const healthMap = useMemo(() => {
    const m = {}
    healthHistory.forEach(d => { m[d.date] = d })
    return m
  }, [healthHistory])

  const healthTimeline = useMemo(
    () =>
      buildTimeline(14, key => ({
        date: key,
        score: healthMap[key]?.health_score ?? null,
      })),
    [healthMap]
  )

  const avgScore = useMemo(() => {
    const valid = healthTimeline.filter(d => d.score !== null)
    if (!valid.length) return 0
    return valid.reduce((s, d) => s + d.score, 0) / valid.length
  }, [healthTimeline])

  const areaColor = scoreColor(avgScore || null)

  const sectionLabel = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: '#94A3B8',
    marginBottom: 16, marginTop: 0,
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#0F172A', minHeight: '100%' }}>
      <div style={{ padding: '16px 18px 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', margin: 0 }}>
          Trends &amp; Prognose
        </h1>
        <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, marginBottom: 0 }}>
          Verlauf der letzten 14 Tage und 7-Tage-Vorschau
        </p>
      </div>

      <div style={{ padding: '8px 14px 80px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── A) Ernährungs-Trend ─────────────────────────────────────────── */}
        <div style={glass}>
          <p style={sectionLabel}>Ernährungs-Trend – letzte 14 Tage</p>

          {nutritionError ? (
            <p style={{ fontSize: 13, color: '#EF4444' }}>Fehler: {nutritionError}</p>
          ) : loadingNutrition ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ChartSkeleton height={200} />
              <ChartSkeleton height={180} />
            </div>
          ) : (
            <>
              <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8, marginTop: 0, fontWeight: 500 }}>
                Kalorienaufnahme (kcal)
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={nutritionTimeline}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 10, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<NutritionKcalTooltip />} />
                  <ReferenceLine
                    y={goals.kcal}
                    stroke="#475569"
                    strokeDasharray="5 4"
                    label={{
                      value: `Ziel ${goals.kcal} kcal`,
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: '#475569',
                      dy: -6,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="kcal"
                    name="Kalorien"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>

              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 20, marginBottom: 8, fontWeight: 500 }}>
                Makronährstoffe pro Tag (g)
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={nutritionTimeline}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 10, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<MacroTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: '#94A3B8' }}
                    iconType="square"
                  />
                  <Bar dataKey="protein" name="Protein" stackId="makros" fill="#8B5CF6" />
                  <Bar dataKey="kohlenhydrate" name="Kohlenhydrate" stackId="makros" fill="#F59E0B" />
                  <Bar dataKey="fett" name="Fett" stackId="makros" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {nutritionTimeline.every(d => d.kcal === null) && (
                <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
                  Noch keine Ernährungsdaten – trage im Ernährungs-Check deine Mahlzeiten ein.
                </p>
              )}
            </>
          )}
        </div>

        {/* ── B) Gesundheits-Score-Verlauf ───────────────────────────────── */}
        <div style={glass}>
          <p style={sectionLabel}>Gesundheits-Score – letzte 14 Tage</p>
          {avgScore > 0 && (
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16, marginTop: -8 }}>
              Ø {Math.round(avgScore)} Punkte –{' '}
              <span style={{ color: areaColor, fontWeight: 600 }}>
                {avgScore >= 75 ? 'Gut' : avgScore >= 50 ? 'Mäßig' : 'Schlecht'}
              </span>
            </p>
          )}

          {healthError ? (
            <p style={{ fontSize: 13, color: '#EF4444' }}>Fehler: {healthError}</p>
          ) : loadingHealth ? (
            <ChartSkeleton height={220} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={healthTimeline}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={areaColor} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={areaColor} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 10, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ScoreTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name="Score"
                    stroke={areaColor}
                    strokeWidth={2}
                    fill="url(#scoreGradient)"
                    connectNulls={false}
                    dot={{ r: 3, fill: areaColor, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>

              {healthTimeline.every(d => d.score === null) && (
                <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
                  Noch keine Score-Daten – besuche täglich diese Seite, um den Verlauf aufzubauen.
                </p>
              )}
            </>
          )}
        </div>

        {/* ── C) 7-Tage-Prognose ─────────────────────────────────────────── */}
        <div style={glass}>
          <p style={sectionLabel}>7-Tage-Prognose</p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16, marginTop: -8 }}>
            Prognostizierter Gesundheits-Score auf Basis von Luft, UV &amp; Pollen
          </p>

          {forecastError ? (
            <p style={{ fontSize: 13, color: '#EF4444' }}>Fehler: {forecastError}</p>
          ) : loadingForecast ? (
            <ChartSkeleton height={220} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={forecastData}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 10, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ForecastTooltip />} />
                  <Bar dataKey="score" name="Score" radius={[5, 5, 0, 0]}>
                    {forecastData.map((entry, index) => (
                      <Cell key={index} fill={scoreColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  { color: '#10B981', label: 'Gut (≥ 75)' },
                  { color: '#F59E0B', label: 'Mäßig (≥ 50)' },
                  { color: '#EF4444', label: 'Schlecht (< 50)' },
                ].map(({ color, label }) => (
                  <div key={color} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: color }} />
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
