import { supabase } from '../supabase'

// ─── Supabase-Abfragen ─────────────────────────────────────────────────────────

export async function searchFoods(query) {
  if (!query.trim()) return []
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .ilike('name', `%${query.trim()}%`)
    .order('name')
    .limit(25)
  if (error) throw new Error('Suche fehlgeschlagen: ' + error.message)
  return data ?? []
}

export async function addFood(userId, food) {
  const { data, error } = await supabase
    .from('foods')
    .insert({
      name:                    food.name.trim(),
      brand:                   food.brand?.trim() || null,
      nutriscore:              food.nutriscore || null,
      energie:                 Number(food.energie) || 0,
      protein:                 Number(food.protein) || 0,
      kohlenhydrate:           Number(food.kohlenhydrate) || 0,
      fett:                    Number(food.fett) || 0,
      gesaettigte_fettsaeuren: Number(food.gesaettigte_fettsaeuren) || 0,
      zucker:                  Number(food.zucker) || 0,
      ballaststoffe:           Number(food.ballaststoffe) || 0,
      salz:                    Number(food.salz) || 0,
      allergene:               food.allergene ?? [],
      created_by:              userId,
    })
    .select()
    .single()
  if (error) throw new Error('Speichern fehlgeschlagen: ' + error.message)
  return data
}

// ─── Hilfsfunktionen (vorher in openFoodFacts.js) ──────────────────────────────

export const NUTRISCORE_COLORS = {
  a: { bg: 'bg-green-600',  text: 'text-white',     label: 'A' },
  b: { bg: 'bg-green-400',  text: 'text-white',     label: 'B' },
  c: { bg: 'bg-yellow-400', text: 'text-gray-800',  label: 'C' },
  d: { bg: 'bg-orange-500', text: 'text-white',     label: 'D' },
  e: { bg: 'bg-red-600',    text: 'text-white',     label: 'E' },
}

// Mappt ein foods-Tabellenobjekt auf das interne nutrients-Format
// (kompatibel mit calcItemNutrients in utils/ernaehrung.js)
export function nutrientsFromFood(food) {
  return {
    energie:                 food.energie                 ?? 0,
    protein:                 Number(food.protein)         || 0,
    kohlenhydrate:           Number(food.kohlenhydrate)   || 0,
    fett:                    Number(food.fett)             || 0,
    gesaettigteFettsaeuren:  Number(food.gesaettigte_fettsaeuren) || 0,
    zucker:                  Number(food.zucker)           || 0,
    ballaststoffe:           Number(food.ballaststoffe)   || 0,
    eiweiss:                 Number(food.protein)          || 0, // Alias für calcItemNutrients
    salz:                    Number(food.salz)             || 0,
  }
}

export const ALLERGEN_OPTIONS = [
  'Gluten', 'Milch', 'Eier', 'Erdnüsse', 'Nüsse', 'Sojaprodukte',
  'Fisch', 'Krebstiere', 'Weichtiere', 'Sesam', 'Sulfite', 'Sellerie',
  'Senf', 'Lupine',
]

// Mögliche Unverträglichkeiten, die der Nutzer im Profil angeben kann
export const FOOD_INTOLERANCE_OPTIONS = [
  'Gluten', 'Laktose', 'Fruktose', 'Histamin', 'Nüsse',
  'Soja', 'Ei', 'Sellerie', 'Senf', 'Sesam',
  'Lupine', 'Weichtiere', 'Krebstiere', 'Fisch',
]

// Mappt Nutzer-Unverträglichkeit → Keywords, die in food.allergene gesucht werden
const INTOLERANCE_KEYWORDS = {
  'Gluten':     ['gluten'],
  'Laktose':    ['milch', 'laktose', 'lactose'],
  'Fruktose':   ['fruktose', 'fructose'],
  'Histamin':   ['histamin'],
  'Nüsse':      ['nüsse', 'erdnüsse'],
  'Soja':       ['soja'],
  'Ei':         ['eier', 'ei'],
  'Sellerie':   ['sellerie'],
  'Senf':       ['senf'],
  'Sesam':      ['sesam'],
  'Lupine':     ['lupine'],
  'Weichtiere': ['weichtiere'],
  'Krebstiere': ['krebstiere'],
  'Fisch':      ['fisch'],
}

/**
 * Gibt die Unverträglichkeiten zurück, die mit den Allergenen des Lebensmittels
 * übereinstimmen. Case-insensitiv; "glutenfrei" matcht NICHT "gluten".
 */
export function checkIntolerances(food, userIntolerances) {
  if (!userIntolerances?.length || !food?.allergene?.length) return []
  return userIntolerances.filter(intolerance => {
    const keywords = INTOLERANCE_KEYWORDS[intolerance] ?? [intolerance.toLowerCase()]
    return food.allergene.some(allergen => {
      const lower = allergen.toLowerCase()
      return keywords.some(kw => lower.includes(kw) && !lower.includes(kw + 'frei'))
    })
  })
}
