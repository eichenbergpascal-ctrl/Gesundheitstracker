import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts'
import { useGeolocation } from '../hooks/useGeolocation'
import { useUserSettings } from '../hooks/useUserSettings'
import {
  fetchAirQualityData, fetchUVData, fetchWeatherData,
  getDailyMaxValues, getAQILabel, getUVLabel, getPollenLabel, getWeatherLabel,
  ALLERGEN_MAP
} from '../services/openMeteo'

const ALLERGEN_OPTIONS = Object.entries(ALLERGEN_MAP).map(([id, v]) => ({ id, ...v }))

const glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 16,
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: 12, fontSize: 13,
    }}>
      <p style={{ fontWeight: 600, color: '#F1F5F9', marginBottom: 4, marginTop: 0 }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ color: p.color, fontSize: 10 }}>■</span>
          <span style={{ color: '#94A3B8' }}>{p.name}:</span>
          <span style={{ fontWeight: 500, color: '#F1F5F9' }}>{Math.round(p.value)} K/m³</span>
        </div>
      ))}
    </div>
  )
}

function AQIColorClass(aqi) {
  if (aqi <= 20) return '#10B981'
  if (aqi <= 40) return '#10B981'
  if (aqi <= 60) return '#F59E0B'
  if (aqi <= 80) return '#F97066'
  return '#EF4444'
}

function UVColorClass(uv) {
  if (uv <= 2) return '#10B981'
  if (uv <= 5) return '#F59E0B'
  if (uv <= 7) return '#F97066'
  return '#EF4444'
}

export default function AllergieRadar({ user }) {
  const { location } = useGeolocation()
  const { settings } = useUserSettings(user.id)
  const [chartData, setChartData] = useState([])
  const [todayStats, setTodayStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stadtName, setStadtName] = useState(null)
  const [weather, setWeather] = useState(null)

  const selectedAllergies = settings.selectedAllergies

  useEffect(() => {
    if (!location) return
    setLoading(true)

    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${location.lat}` +
      `&lon=${location.lon}&format=json&accept-language=de`
    )
      .then(r => r.json())
      .then(d => {
        const name = d.address?.city || d.address?.town || d.address?.village
          || d.address?.municipality || 'Unbekannter Ort'
        setStadtName(name)
      })
      .catch(() => {})

    Promise.all([
      fetchAirQualityData(location.lat, location.lon),
      fetchUVData(location.lat, location.lon),
      fetchWeatherData(location.lat, location.lon),
    ]).then(([aqiData, uvData, weatherData]) => {
      const hourly = aqiData.hourly

      const allergenDaily = {}
      ALLERGEN_OPTIONS.forEach(({ id, key }) => {
        allergenDaily[id] = getDailyMaxValues(hourly, key)
      })

      const aqiDaily = getDailyMaxValues(hourly, 'european_aqi')
      const dates = Object.keys(allergenDaily.birke).slice(0, 7)
      const chart = dates.map(date => {
        const row = { date: formatDate(date), dateRaw: date }
        ALLERGEN_OPTIONS.forEach(({ id, label }) => {
          row[label] = Math.round(allergenDaily[id][date] ?? 0)
        })
        return row
      })
      setChartData(chart)

      const todayDate = new Date().toISOString().slice(0, 10)
      setTodayStats({
        aqi: Math.round(aqiDaily[todayDate] ?? 0),
        uv: uvData.daily?.uv_index_max?.[0] ?? 0,
      })

      setWeather(weatherData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [location])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256, color: '#475569' }}>
        <p>Pollendaten werden geladen…</p>
      </div>
    )
  }

  const visibleAllergies = selectedAllergies.length > 0
    ? ALLERGEN_OPTIONS.filter(a => selectedAllergies.includes(a.id))
    : ALLERGEN_OPTIONS

  let next8 = []
  if (weather) {
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const currentHour = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}`
    const times = weather.hourly.time
    const startIdx = times.findIndex(t => t.startsWith(currentHour))
    if (startIdx !== -1) {
      next8 = times.slice(startIdx, startIdx + 8).map((t, i) => ({
        time: t,
        temp: weather.hourly.temperature_2m[startIdx + i],
        code: weather.hourly.weathercode[startIdx + i],
      }))
    }
  }

  const aqiColor = todayStats ? AQIColorClass(todayStats.aqi) : '#94A3B8'
  const uvColor = todayStats ? UVColorClass(todayStats.uv) : '#94A3B8'

  return (
    <div style={{ background: '#0F172A', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ padding: '16px 18px 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', margin: 0 }}>Allergie-Radar</h1>
        <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, marginBottom: 0 }}>
          7-Tage Pollenvorhersage
          {stadtName && <span style={{ fontWeight: 500, color: '#F1F5F9' }}> · {stadtName}</span>}
        </p>
      </div>

      <div style={{ padding: '8px 14px 80px' }}>

        {/* Wetter Hero Card */}
        {weather && (
          <div style={{
            ...glass,
            marginBottom: 10,
            background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(16,185,129,0.05))',
            border: '1px solid rgba(6,182,212,0.15)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: -30, right: -30, width: 100, height: 100,
              background: 'radial-gradient(circle, rgba(6,182,212,0.2), transparent)',
              borderRadius: '50%', pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              <div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 40, fontWeight: 700, color: '#F1F5F9', lineHeight: 1,
                }}>
                  {Math.round(weather.current.temperature_2m)}°C
                </div>
                <div style={{ fontSize: 13, color: '#06B6D4', fontWeight: 600, marginTop: 4 }}>
                  {getWeatherLabel(weather.current.weathercode)}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: '#94A3B8', lineHeight: 1.8 }}>
                <div>Gefühlt {Math.round(weather.current.apparent_temperature)}°C</div>
                <div>Luftfeuchte {weather.current.relative_humidity_2m}%</div>
                <div>Wind {Math.round(weather.current.windspeed_10m)} km/h</div>
              </div>
            </div>

            {next8.length > 0 && (
              <div style={{
                marginTop: 14, paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                overflowX: 'auto',
              }}>
                <p style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#94A3B8', marginBottom: 10, marginTop: 0,
                }}>
                  Stündliche Vorschau
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {next8.map(({ time, temp, code }, i) => {
                    const label = getWeatherLabel(code)
                    const shortLabel = label.length > 8 ? label.slice(0, 8) + '…' : label
                    return (
                      <div key={time} style={{
                        flexShrink: 0, minWidth: 52, textAlign: 'center',
                        padding: '6px', borderRadius: 8,
                        background: i === 0 ? 'rgba(6,182,212,0.1)' : 'transparent',
                      }}>
                        <div style={{ fontSize: 9, color: '#94A3B8' }}>
                          {i === 0 ? 'Jetzt' : `${new Date(time).getHours()}:00`}
                        </div>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 14, fontWeight: 700, color: '#F1F5F9', margin: '3px 0',
                        }}>
                          {Math.round(temp)}°
                        </div>
                        <div style={{ fontSize: 8, color: '#94A3B8' }}>{shortLabel}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AQI + UV */}
        {todayStats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div style={glass}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 28, fontWeight: 700, color: '#F1F5F9',
              }}>{todayStats.aqi}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Luftqualität (AQI)</div>
              <span style={{
                display: 'inline-flex', marginTop: 8,
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                background: `${aqiColor}18`, color: aqiColor,
                border: `1px solid ${aqiColor}33`,
              }}>
                {getAQILabel(todayStats.aqi).text}
              </span>
            </div>
            <div style={glass}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 28, fontWeight: 700, color: '#F1F5F9',
              }}>{todayStats.uv?.toFixed(1)}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>UV-Index (max)</div>
              <span style={{
                display: 'inline-flex', marginTop: 8,
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                background: `${uvColor}18`, color: uvColor,
                border: `1px solid ${uvColor}33`,
              }}>
                {getUVLabel(todayStats.uv).text}
              </span>
            </div>
          </div>
        )}

        {/* Pollen-Chart */}
        <div style={{ ...glass, marginBottom: 10 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#94A3B8', marginBottom: 16, marginTop: 0,
          }}>
            Pollenbelastung – 7 Tage (Körner/m³)
          </p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                {visibleAllergies.map(({ label, color }) => (
                  <Bar key={label} dataKey={label} fill={color} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
              Keine Chartdaten verfügbar.
            </p>
          )}
        </div>

        {/* Heutige Pollenwerte */}
        {chartData[0] && (
          <div style={glass}>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#94A3B8', marginBottom: 4, marginTop: 0,
            }}>
              Heutige Pollenbelastung
            </p>
            <div>
              {ALLERGEN_OPTIONS.map(({ id, label, color }) => {
                const val = chartData[0]?.[label] ?? 0
                const info = getPollenLabel(val)
                const isSelected = selectedAllergies.length === 0 || selectedAllergies.includes(id)
                const levelColor = val > 120 ? '#EF4444' : val > 40 ? '#F59E0B' : '#10B981'
                return (
                  <div key={id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0',
                    opacity: isSelected ? 1 : 0.35,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#F1F5F9', flex: 1 }}>{label}</span>
                    <div style={{ width: 80 }}>
                      <div style={{ width: '100%', height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 999,
                          width: `${Math.min(100, (val / 200) * 100)}%`,
                          background: color,
                        }} />
                      </div>
                    </div>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10, color: '#94A3B8', width: 52, textAlign: 'right',
                    }}>
                      {val} K/m³
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                      background: `${levelColor}18`, color: levelColor,
                    }}>
                      {info.text}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
