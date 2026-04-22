const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

export async function fetchAirQualityData(lat, lon) {
  const url = `${AIR_QUALITY_URL}?latitude=${lat}&longitude=${lon}` +
    `&hourly=european_aqi,birch_pollen,grass_pollen,alder_pollen,mugwort_pollen` +
    `&timezone=auto&forecast_days=7`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Luftqualitätsdaten konnten nicht geladen werden')
  return res.json()
}

export async function fetchUVData(lat, lon) {
  const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
    `&daily=uv_index_max&timezone=auto&forecast_days=7`
  const res = await fetch(url)
  if (!res.ok) throw new Error('UV-Daten konnten nicht geladen werden')
  return res.json()
}

// Findet den Wert für die aktuelle Stunde in Stundendaten
export function getCurrentHourValue(hourly, variable) {
  const now = new Date()
  const currentHourStr = now.toISOString().slice(0, 13) // "2024-01-15T14"
  const times = hourly.time
  const values = hourly[variable]

  let idx = times.findIndex(t => t.startsWith(currentHourStr))
  if (idx !== -1 && values[idx] != null) return values[idx]

  // Fallback: letzter bekannter Wert von heute
  const todayStr = now.toISOString().slice(0, 10)
  for (let i = times.length - 1; i >= 0; i--) {
    if (times[i].startsWith(todayStr) && values[i] != null) return values[i]
  }
  return 0
}

// Gibt Tages-Maximum-Werte zurück (für Charts)
export function getDailyMaxValues(hourly, variable) {
  const times = hourly.time
  const values = hourly[variable]
  const dailyMap = {}

  times.forEach((t, i) => {
    const date = t.slice(0, 10)
    const val = values[i] ?? 0
    if (!(date in dailyMap) || val > dailyMap[date]) {
      dailyMap[date] = val
    }
  })
  return dailyMap
}

// Berechnet den Gesundheits-Score (0-100)
export function calculateHealthScore(aqi, uvMax, pollenValues, selectedAllergies) {
  // Luftqualität (European AQI: 0=gut … 100+=extrem schlecht)
  let aqiScore = 100
  if (aqi > 20) aqiScore = 80
  if (aqi > 40) aqiScore = 60
  if (aqi > 60) aqiScore = 40
  if (aqi > 80) aqiScore = 20

  // UV-Index
  let uvScore = 100
  if (uvMax > 2) uvScore = 75
  if (uvMax > 5) uvScore = 50
  if (uvMax > 7) uvScore = 30
  if (uvMax > 10) uvScore = 15

  // Pollenbelastung (basierend auf gewählten Allergenen)
  let pollenScore = 100
  if (selectedAllergies.length > 0) {
    const maxPollen = Math.max(0, ...selectedAllergies.map(k => pollenValues[k] ?? 0))
    if (maxPollen > 100) pollenScore = 20
    else if (maxPollen > 50) pollenScore = 40
    else if (maxPollen > 10) pollenScore = 65
    else if (maxPollen > 0) pollenScore = 85
  }

  return Math.round((aqiScore + uvScore + pollenScore) / 3)
}

export const ALLERGEN_MAP = {
  birke: { key: 'birch_pollen', label: 'Birke', color: '#60a5fa' },
  graeser: { key: 'grass_pollen', label: 'Gräser', color: '#34d399' },
  hasel: { key: 'alder_pollen', label: 'Hasel/Erle', color: '#fbbf24' },
  beifuss: { key: 'mugwort_pollen', label: 'Beifuß', color: '#f87171' },
}

export function getAQILabel(aqi) {
  if (aqi <= 20) return { text: 'Gut', color: 'text-green-600' }
  if (aqi <= 40) return { text: 'Mäßig', color: 'text-yellow-600' }
  if (aqi <= 60) return { text: 'Mittelmäßig', color: 'text-orange-500' }
  if (aqi <= 80) return { text: 'Schlecht', color: 'text-red-500' }
  return { text: 'Sehr schlecht', color: 'text-red-700' }
}

export function getUVLabel(uv) {
  if (uv <= 2) return { text: 'Niedrig', color: 'text-green-600' }
  if (uv <= 5) return { text: 'Mäßig', color: 'text-yellow-600' }
  if (uv <= 7) return { text: 'Hoch', color: 'text-orange-500' }
  if (uv <= 10) return { text: 'Sehr hoch', color: 'text-red-500' }
  return { text: 'Extrem', color: 'text-purple-600' }
}

export function getPollenLabel(val) {
  if (val === 0) return { text: 'Keine', color: 'text-green-600' }
  if (val <= 10) return { text: 'Niedrig', color: 'text-green-600' }
  if (val <= 50) return { text: 'Mäßig', color: 'text-yellow-600' }
  if (val <= 100) return { text: 'Hoch', color: 'text-orange-500' }
  return { text: 'Sehr hoch', color: 'text-red-600' }
}

export async function fetchWeatherData(lat, lon) {
  const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,` +
    `relative_humidity_2m` +
    `&hourly=temperature_2m,weathercode` +
    `&timezone=auto&forecast_days=2`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Wetterdaten konnten nicht geladen werden')
  return res.json()
}

export function getWeatherLabel(code) {
  if (code === 0) return 'Klar'
  if (code <= 3) return 'Teilweise bewölkt'
  if (code <= 48) return 'Bewölkt / Nebel'
  if (code <= 55) return 'Nieselregen'
  if (code <= 65) return 'Regen'
  if (code <= 75) return 'Schnee'
  if (code <= 82) return 'Regenschauer'
  if (code <= 99) return 'Gewitter'
  return 'Unbekannt'
}
