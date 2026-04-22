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

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' })
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-[#E8E6E1] rounded-[10px] p-3 text-sm">
      <p className="font-semibold text-[#1A1A1A] mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span style={{ color: p.color }}>■</span>
          <span className="text-[#6B6B6B]">{p.name}:</span>
          <span className="font-medium text-[#1A1A1A]">{Math.round(p.value)} K/m³</span>
        </div>
      ))}
    </div>
  )
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

    // Reverse Geocoding (unabhängig, Fehler werden ignoriert)
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${location.lat}` +
      `&lon=${location.lon}&format=json&accept-language=de`
    )
      .then(r => r.json())
      .then(d => {
        const name = d.address?.city
          || d.address?.town
          || d.address?.village
          || d.address?.municipality
          || 'Unbekannter Ort'
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
      <div className="flex items-center justify-center h-64 text-[#A8A8A8]">
        <p>Pollendaten werden geladen…</p>
      </div>
    )
  }

  const visibleAllergies = selectedAllergies.length > 0
    ? ALLERGEN_OPTIONS.filter(a => selectedAllergies.includes(a.id))
    : ALLERGEN_OPTIONS

  // Stündliche Vorschau berechnen
  let next8 = []
  if (weather) {
    const now = new Date()
    const currentHour = now.toISOString().slice(0, 13)
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

  return (
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-5xl mx-auto w-full pb-24 md:pb-6">
      <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Allergie-Radar</h1>
      <p className="text-[#6B6B6B] text-sm mb-6">
        7-Tage Pollenvorhersage
        {stadtName && <span className="font-medium text-[#1A1A1A]"> · {stadtName}</span>}
      </p>

      {/* Aktuelle Wetterlage */}
      {weather && (
        <div className="bg-white rounded-[14px] p-5 border border-[#E8E6E1] mb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-4xl font-bold text-[#1A1A1A]">
                {Math.round(weather.current.temperature_2m)}°C
              </div>
              <div className="text-sm text-[#6B6B6B] mt-1">
                {getWeatherLabel(weather.current.weathercode)}
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-sm text-[#6B6B6B]">
                Gefühlt {Math.round(weather.current.apparent_temperature)}°C
              </div>
              <div className="text-sm text-[#6B6B6B]">
                Luftfeuchte {weather.current.relative_humidity_2m}%
              </div>
              <div className="text-sm text-[#6B6B6B]">
                Wind {Math.round(weather.current.windspeed_10m)} km/h
              </div>
            </div>
          </div>

          {next8.length > 0 && (
            <div className="border-t border-[#F2F1EE] mt-4 pt-4">
              <p className="text-xs font-semibold text-[#A8A8A8] uppercase tracking-wide mb-3">
                Stündliche Vorschau
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {next8.map(({ time, temp, code }) => {
                  const label = getWeatherLabel(code)
                  const shortLabel = label.length > 8 ? label.slice(0, 8) + '…' : label
                  return (
                    <div
                      key={time}
                      className="shrink-0 bg-[#F8F7F4] rounded-[10px] px-3 py-2 text-center min-w-[60px]"
                    >
                      <div className="text-xs text-[#A8A8A8]">
                        {new Date(time).getHours()}:00
                      </div>
                      <div className="text-sm font-semibold text-[#1A1A1A] mt-1">
                        {Math.round(temp)}°
                      </div>
                      <div className="text-[10px] text-[#6B6B6B] mt-0.5">
                        {shortLabel}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Heutige Luftwerte */}
      {todayStats && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white rounded-[14px] p-4 border border-[#E8E6E1]">
            <div className="text-xl font-bold text-[#1A1A1A]">{todayStats.aqi}</div>
            <div className="text-xs text-[#6B6B6B] mt-0.5">Luftqualität (AQI)</div>
            <div className={`text-xs font-semibold mt-1 ${getAQILabel(todayStats.aqi).color}`}>
              {getAQILabel(todayStats.aqi).text}
            </div>
          </div>
          <div className="bg-white rounded-[14px] p-4 border border-[#E8E6E1]">
            <div className="text-xl font-bold text-[#1A1A1A]">{todayStats.uv?.toFixed(1)}</div>
            <div className="text-xs text-[#6B6B6B] mt-0.5">UV-Index (max)</div>
            <div className={`text-xs font-semibold mt-1 ${getUVLabel(todayStats.uv).color}`}>
              {getUVLabel(todayStats.uv).text}
            </div>
          </div>
        </div>
      )}

      {/* Pollen-Chart */}
      <div className="bg-white rounded-[14px] p-5 border border-[#E8E6E1] mb-5">
        <h2 className="text-sm font-semibold text-[#1A1A1A] mb-4">
          Pollenbelastung – 7 Tage (Körner/m³)
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F1EE" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#A8A8A8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#A8A8A8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {visibleAllergies.map(({ label, color }) => (
                <Bar key={label} dataKey={label} fill={color} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[#A8A8A8] text-sm text-center py-8">Keine Chartdaten verfügbar.</p>
        )}
      </div>

      {/* Heutige Pollenwerte als Tabelle */}
      {chartData[0] && (
        <div className="bg-white rounded-[14px] p-5 border border-[#E8E6E1]">
          <h2 className="text-sm font-semibold text-[#1A1A1A] mb-3">Heutige Pollenbelastung</h2>
          <div className="space-y-2">
            {ALLERGEN_OPTIONS.map(({ id, label, color }) => {
              const val = chartData[0]?.[label] ?? 0
              const info = getPollenLabel(val)
              const isSelected = selectedAllergies.length === 0 || selectedAllergies.includes(id)
              return (
                <div key={id} className={`flex items-center gap-3 py-1.5 ${isSelected ? '' : 'opacity-40'}`}>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm text-[#1A1A1A] flex-1">{label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: '#E8E6E1' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, (val / 200) * 100)}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="text-xs text-[#A8A8A8] w-16 text-right">{val} K/m³</span>
                    <span className={`text-xs font-semibold w-20 text-right ${info.color}`}>{info.text}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
