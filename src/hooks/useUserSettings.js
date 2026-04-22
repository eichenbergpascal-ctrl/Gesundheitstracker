import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const DEFAULT_SETTINGS = {
  selectedAllergies: [],
  foodIntolerances: [],
  ernaehrungsziele: { kcal: 2000, protein: 150, kohlenhydrate: 250, fett: 65 },
  geschlecht: '',
  geburtsdatum: '',
  groesse: null,
  gewicht: null,
  aktivitaet: 'maessig',
  ernaehrungsweise: 'keine',
}

// Map Supabase column names → app field names
function fromDb(row) {
  return {
    selectedAllergies: row.allergien ?? [],
    foodIntolerances: row.food_intolerances ?? [],
    ernaehrungsziele: row.nutrition_goals ?? DEFAULT_SETTINGS.ernaehrungsziele,
    geschlecht: row.geschlecht ?? '',
    geburtsdatum: row.geburtsdatum ?? '',
    groesse: row.groesse ?? null,
    gewicht: row.gewicht ?? null,
    aktivitaet: row.aktivitaet ?? 'maessig',
    ernaehrungsweise: row.ernaehrungsweise ?? 'keine',
  }
}

// Map app field names → Supabase column names
function toDb(userId, settings) {
  return {
    user_id: userId,
    allergien: settings.selectedAllergies,
    food_intolerances: settings.foodIntolerances,
    nutrition_goals: settings.ernaehrungsziele,
    geschlecht: settings.geschlecht || null,
    geburtsdatum: settings.geburtsdatum || null,
    groesse: settings.groesse,
    gewicht: settings.gewicht,
    aktivitaet: settings.aktivitaet,
    ernaehrungsweise: settings.ernaehrungsweise,
  }
}

export function useUserSettings(userId) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(fromDb(data))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [userId])

  async function updateSettings(updates) {
    const merged = { ...settings, ...updates }
    setSettings(merged)
    await supabase.from('user_settings').upsert(toDb(userId, merged))
  }

  return { settings, updateSettings, loading }
}
