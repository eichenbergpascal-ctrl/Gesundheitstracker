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
  if (score == null) return '#A8A8A8'
  if (score >= 75) return '#2D6A4F'
  if (score >= 50) return '#B45309'
  return '#991B1B'
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

// ─── Custom Tooltips ────────────────────────────────────────────────────────

function NutritionKcalTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#E8E6E1] rounded-[10px] p-3 shadow-sm text-sm">
      <p className="font-semibold text-[#1A1A1A] mb-1">{formatShortDate(label)}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-[#6B6B6B]">
          {p.name}:{' '}
          <span className="font-semibold" style={{ color: p.color }}>
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
    <div className="bg-white border border-[#E8E6E1] rounded-[10px] p-3 shadow-sm text-sm">
      <p className="font-semibold text-[#1A1A1A] mb-1">{formatShortDate(label)}</p>
      {payload.map(p => (
        <p key={p.dataKey} className="text-[#6B6B6B]">
          {p.name}:{' '}
          <span className="font-semibold" style={{ color: p.color }}>
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
    <div className="bg-white border border-[#E8E6E1] rounded-[10px] p-3 shadow-sm text-sm">
      <p className="font-semibold text-[#1A1A1A] mb-1">{formatShortDate(label)}</p>
      <p className="text-[#6B6B6B]">
        Score:{' '}
        <span className="font-semibold" style={{ color: scoreColor(score) }}>
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
    <div className="bg-white border border-[#E8E6E1] rounded-[10px] p-3 shadow-sm text-sm">
      <p className="font-semibold text-[#1A1A1A] mb-1">{formatShortDate(label)}</p>
      <p className="text-[#6B6B6B]">
        Score:{' '}
        <span className="font-semibold" style={{ color: scoreColor(d?.score) }}>
          {d?.score ?? '–'}
        </span>
      </p>
      <p className="text-[#6B6B6B]">
        AQI: <span className="font-semibold text-[#1A1A1A]">{d?.aqi ?? '–'}</span>
      </p>
      <p className="text-[#6B6B6B]">
        UV-Index:{' '}
        <span className="font-semibold text-[#1A1A1A]">
          {d?.uvMax != null ? d.uvMax.toFixed(1) : '–'}
        </span>
      </p>
    </div>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function ChartSkeleton({ height = 200 }) {
  return (
    <div
      className="animate-pulse bg-[#F2F1EE] rounded-[10px] w-full"
      style={{ height }}
    />
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

        // Tages-Maxima für jeden Allergen
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

        // Auto-Save: heutigen Score in daily_health_log speichern
        if (forecast.length > 0) {
          const today = forecast[0]
          upsertDailyHealthLog(user.id, today.date, {
            health_score: today.score,
            aqi: today.aqi,
            uv_max: today.uvMax,
          }).catch(() => {}) // silent – kein Block bei Fehler
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

  const areaColor =
    avgScore >= 75 ? '#2D6A4F' : avgScore >= 50 ? '#B45309' : '#991B1B'

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-5xl mx-auto w-full">
      {/* Seitentitel */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Trends &amp; Prognose</h1>
        <p className="text-[#6B6B6B] text-sm mt-1">
          Verlauf der letzten 14 Tage und 7-Tage-Vorschau
        </p>
      </div>

      {/* ── A) Ernährungs-Trend ────────────────────────────────────────────── */}
      <div className="bg-white rounded-[14px] border border-[#E8E6E1] p-5 mb-4">
        <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wide mb-4">
          Ernährungs-Trend – letzte 14 Tage
        </h2>

        {nutritionError ? (
          <p className="text-sm text-[#991B1B]">Fehler: {nutritionError}</p>
        ) : loadingNutrition ? (
          <div className="space-y-3">
            <ChartSkeleton height={200} />
            <ChartSkeleton height={180} />
          </div>
        ) : (
          <>
            {/* Kalorienaufnahme vs. Ziel */}
            <p className="text-xs text-[#6B6B6B] mb-2 font-medium">Kalorienaufnahme (kcal)</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={nutritionTimeline}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F1EE" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10, fill: '#A8A8A8' }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#A8A8A8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<NutritionKcalTooltip />} />
                <ReferenceLine
                  y={goals.kcal}
                  stroke="#A8A8A8"
                  strokeDasharray="5 4"
                  label={{
                    value: `Ziel ${goals.kcal} kcal`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: '#A8A8A8',
                    dy: -6,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="kcal"
                  name="Kalorien"
                  stroke="#2D6A4F"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#2D6A4F', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Makros gestapelt */}
            <p className="text-xs text-[#6B6B6B] mt-5 mb-2 font-medium">
              Makronährstoffe pro Tag (g)
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={nutritionTimeline}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F1EE" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10, fill: '#A8A8A8' }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#A8A8A8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<MacroTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  iconType="square"
                />
                <Bar
                  dataKey="protein"
                  name="Protein"
                  stackId="makros"
                  fill="#8b5cf6"
                />
                <Bar
                  dataKey="kohlenhydrate"
                  name="Kohlenhydrate"
                  stackId="makros"
                  fill="#f97316"
                />
                <Bar
                  dataKey="fett"
                  name="Fett"
                  stackId="makros"
                  fill="#eab308"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            {nutritionTimeline.every(d => d.kcal === null) && (
              <p className="text-xs text-[#A8A8A8] text-center mt-3">
                Noch keine Ernährungsdaten – trage im Ernährungs-Check deine Mahlzeiten ein.
              </p>
            )}
          </>
        )}
      </div>

      {/* ── B) Gesundheits-Score-Verlauf ────────────────────────────────────── */}
      <div className="bg-white rounded-[14px] border border-[#E8E6E1] p-5 mb-4">
        <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wide mb-1">
          Gesundheits-Score – letzte 14 Tage
        </h2>
        {avgScore > 0 && (
          <p className="text-xs text-[#6B6B6B] mb-4">
            Ø {Math.round(avgScore)} Punkte –{' '}
            <span style={{ color: areaColor }} className="font-semibold">
              {avgScore >= 75 ? 'Gut' : avgScore >= 50 ? 'Mäßig' : 'Schlecht'}
            </span>
          </p>
        )}

        {healthError ? (
          <p className="text-sm text-[#991B1B]">Fehler: {healthError}</p>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F1EE" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10, fill: '#A8A8A8' }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#A8A8A8' }}
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
              <p className="text-xs text-[#A8A8A8] text-center mt-3">
                Noch keine Score-Daten – besuche täglich diese Seite, um den Verlauf aufzubauen.
              </p>
            )}
          </>
        )}
      </div>

      {/* ── C) 7-Tage-Prognose ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-[14px] border border-[#E8E6E1] p-5 mb-4">
        <h2 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wide mb-1">
          7-Tage-Prognose
        </h2>
        <p className="text-xs text-[#6B6B6B] mb-4">
          Prognostizierter Gesundheits-Score auf Basis von Luft, UV &amp; Pollen
        </p>

        {forecastError ? (
          <p className="text-sm text-[#991B1B]">Fehler: {forecastError}</p>
        ) : loadingForecast ? (
          <ChartSkeleton height={220} />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={forecastData}
                margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F1EE" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 10, fill: '#A8A8A8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#A8A8A8' }}
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

            {/* Legende Score-Farben */}
            <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
              {[
                { color: '#2D6A4F', label: 'Gut (≥ 75)' },
                { color: '#B45309', label: 'Mäßig (≥ 50)' },
                { color: '#991B1B', label: 'Schlecht (< 50)' },
              ].map(({ color, label }) => (
                <div key={color} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-[#6B6B6B]">{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
