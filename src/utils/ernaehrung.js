// ─── Konstanten ───────────────────────────────────────────────────────────────

export const DEFAULT_GOALS = { kcal: 2000, protein: 150, kohlenhydrate: 250, fett: 65 }

export const MAHLZEITEN = [
  { id: 'fruehstueck', label: 'Frühstück', icon: '🌅' },
  { id: 'mittagessen', label: 'Mittagessen', icon: '☀️' },
  { id: 'abendessen', label: 'Abendessen', icon: '🌙' },
  { id: 'snacks', label: 'Snacks', icon: '🍎' },
]

export const MACRO_CONFIG = [
  { key: 'protein', label: 'Protein', color: '#8b5cf6' },
  { key: 'kohlenhydrate', label: 'Kohlenhydrate', color: '#f97316' },
  { key: 'fett', label: 'Fett', color: '#eab308' },
]

// Session-Cache: überlebt Navigation zwischen Seiten (wird nur bei Page-Refresh zurückgesetzt)
export const logCache = {}

// ─── Datum-Helfer ─────────────────────────────────────────────────────────────

export function dateKey(date) {
  return date.toISOString().slice(0, 10)
}

export function todayKey() {
  return dateKey(new Date())
}

export function offsetDate(base, days) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

export function dayLabel(key) {
  const today = todayKey()
  if (key === today) return 'Heute'
  if (key === offsetDate(new Date(), -1)) return 'Gestern'
  if (key === offsetDate(new Date(), 1)) return 'Morgen'
  return key
}

export function formatDate(dateKey) {
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

// ─── Berechnungen ─────────────────────────────────────────────────────────────

export function calcItemNutrients(item) {
  const f = item.amount / 100
  return {
    kcal: Math.round((item.nutrients?.energie ?? 0) * f),
    protein: parseFloat(((item.nutrients?.eiweiss ?? 0) * f).toFixed(1)),
    kohlenhydrate: parseFloat(((item.nutrients?.kohlenhydrate ?? 0) * f).toFixed(1)),
    fett: parseFloat(((item.nutrients?.fett ?? 0) * f).toFixed(1)),
  }
}

export function calcTotals(items) {
  return items.reduce(
    (acc, item) => {
      const n = calcItemNutrients(item)
      acc.kcal += n.kcal
      acc.protein += n.protein
      acc.kohlenhydrate += n.kohlenhydrate
      acc.fett += n.fett
      return acc
    },
    { kcal: 0, protein: 0, kohlenhydrate: 0, fett: 0 }
  )
}
