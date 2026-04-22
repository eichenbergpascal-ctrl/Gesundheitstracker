import { supabase } from '../supabase'
import { calcTotals } from '../utils/ernaehrung'

/**
 * Liest die letzten `days` Einträge aus nutrition_log und gibt
 * pro Tag die berechneten Makro-Summen zurück.
 */
export async function fetchNutritionHistory(userId, days) {
  const since = new Date()
  since.setDate(since.getDate() - (days - 1))
  const sinceStr = since.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('nutrition_log')
    .select('date, items')
    .eq('user_id', userId)
    .gte('date', sinceStr)
    .order('date', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map(row => {
    const totals = calcTotals(row.items ?? [])
    return { date: row.date, ...totals }
  })
}

/**
 * Schreibt / überschreibt den Tages-Gesundheits-Eintrag.
 */
export async function upsertDailyHealthLog(userId, date, { health_score, aqi, uv_max }) {
  const { error } = await supabase
    .from('daily_health_log')
    .upsert(
      { user_id: userId, date, health_score, aqi, uv_max },
      { onConflict: 'user_id,date' }
    )

  if (error) throw new Error(error.message)
}

/**
 * Liest die letzten `days` Einträge aus daily_health_log.
 */
export async function fetchHealthScoreHistory(userId, days) {
  const since = new Date()
  since.setDate(since.getDate() - (days - 1))
  const sinceStr = since.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('daily_health_log')
    .select('date, health_score, aqi, uv_max')
    .eq('user_id', userId)
    .gte('date', sinceStr)
    .order('date', { ascending: true })

  if (error) throw new Error(error.message)

  return data ?? []
}
