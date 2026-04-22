import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { useUserSettings } from '../hooks/useUserSettings'
import { nutrientsFromFood } from '../services/foods'
import { logCache, MAHLZEITEN, MACRO_CONFIG, todayKey, offsetDate, dayLabel, formatDate, calcTotals, DEFAULT_GOALS } from '../utils/ernaehrung'
import CalorieRing from '../components/ernaehrung/CalorieRing'
import MacroBar from '../components/ernaehrung/MacroBar'
import MahlzeitSection from '../components/ernaehrung/MahlzeitSection'
import SearchModal from '../components/ernaehrung/SearchModal'
import ZieleEditor from '../components/ernaehrung/ZieleEditor'

export default function ErnaehrungsCheck({ user }) {
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [log, setLog] = useState(logCache[todayKey()] ?? [])
  const [loadingLog, setLoadingLog] = useState(!logCache[todayKey()])
  const [searchModal, setSearchModal] = useState(null)
  const [showZiele, setShowZiele] = useState(false)
  const [dbError, setDbError] = useState(null)
  const { settings, updateSettings } = useUserSettings(user.id)
  const goals = settings.ernaehrungsziele ?? DEFAULT_GOALS

  const yesterday = offsetDate(new Date(), -1)
  const tomorrow = offsetDate(new Date(), 1)
  const canGoPrev = selectedDate > yesterday
  const canGoNext = selectedDate < tomorrow
  const totals = useMemo(() => calcTotals(log), [log])

  useEffect(() => {
    if (logCache[selectedDate] !== undefined) {
      setLog(logCache[selectedDate])
      setLoadingLog(false)
      return
    }
    setLoadingLog(true)
    supabase
      .from('nutrition_log')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', selectedDate)
      .maybeSingle()
      .then(({ data }) => {
        const items = data?.items ?? []
        logCache[selectedDate] = items
        setLog(items)
        setLoadingLog(false)
      })
      .catch(() => {
        logCache[selectedDate] = []
        setLog([])
        setLoadingLog(false)
      })
  }, [user.id, selectedDate])

  async function persistLog(newLog) {
    const previous = log
    logCache[selectedDate] = newLog
    setLog(newLog)
    setDbError(null)
    const { error } = await supabase.from('nutrition_log').upsert({
      user_id: user.id,
      date: selectedDate,
      items: newLog,
    }, { onConflict: 'user_id,date' })
    if (error) {
      logCache[selectedDate] = previous
      setLog(previous)
      setDbError('Speichern fehlgeschlagen – bitte erneut versuchen.')
    }
  }

  async function handleAdd(food, amount, mahlzeitId) {
    await persistLog([...log, {
      id: Date.now().toString(),
      productName: food.name || 'Unbekannt',
      brand: food.brand || '',
      amount,
      nutriScore: food.nutriscore || '',
      nutrients: nutrientsFromFood(food),
      mahlzeit: mahlzeitId,
      addedAt: new Date().toISOString(),
    }])
  }

  async function handleRemove(id) { await persistLog(log.filter(i => i.id !== id)) }
  async function handleSaveGoals(g) { await updateSettings({ ernaehrungsziele: g }) }
  function handlePrevDay() { if (canGoPrev) setSelectedDate(d => offsetDate(new Date(d), -1)) }
  function handleNextDay() { if (canGoNext) setSelectedDate(d => offsetDate(new Date(d), 1)) }

  const navBtnClass = (enabled) =>
    `w-8 h-8 rounded-full flex items-center justify-center transition-colors text-base font-bold ${
      enabled
        ? 'bg-[#F2F1EE] text-[#6B6B6B] hover:bg-[#E8E6E1]'
        : 'bg-[#F2F1EE] text-[#CFCCC5] cursor-not-allowed'
    }`

  return (
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-5xl mx-auto w-full pb-24 md:pb-6">
      {dbError && (
        <div className="mb-4 px-4 py-2.5 rounded-[10px] bg-red-50 border border-red-200 flex items-center justify-between">
          <span className="text-sm text-[#991B1B]">{dbError}</span>
          <button onClick={() => setDbError(null)} className="text-[#991B1B] text-lg leading-none ml-3">×</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={handlePrevDay} disabled={!canGoPrev} className={navBtnClass(canGoPrev)} aria-label="Vorheriger Tag">‹</button>
          <div className="text-center min-w-0">
            <h1 className="text-xl font-bold text-[#1A1A1A] leading-none">{dayLabel(selectedDate)}</h1>
            <p className="text-xs text-[#A8A8A8] mt-0.5">{formatDate(selectedDate)}</p>
          </div>
          <button onClick={handleNextDay} disabled={!canGoNext} className={navBtnClass(canGoNext)} aria-label="Nächster Tag">›</button>
        </div>
        <button
          onClick={() => setShowZiele(true)}
          className="text-xs text-[#6B6B6B] hover:text-[#2D6A4F] transition-colors"
        >
          Ziele anpassen
        </button>
      </div>

      {loadingLog ? (
        <div className="flex items-center justify-center py-16 text-[#A8A8A8]">
          <p className="text-sm">Lädt…</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-[14px] border border-[#E8E6E1] p-5 mb-4">
            <div className="flex flex-col items-center mb-5">
              <CalorieRing consumed={totals.kcal} goal={goals.kcal} />
              <div className="flex gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-[#6B6B6B]">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#2D6A4F' }} />
                  Gegessen
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#6B6B6B]">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: '#E8E6E1' }} />
                  Verbleibend
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {MACRO_CONFIG.map(m => (
                <MacroBar key={m.key} label={m.label} consumed={totals[m.key]} goal={goals[m.key]} color={m.color} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {MAHLZEITEN.map(mz => (
              <MahlzeitSection
                key={mz.id} mahlzeit={mz}
                items={log.filter(i => (i.mahlzeit || 'snacks') === mz.id)}
                onAdd={() => setSearchModal(mz)}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </>
      )}

      {searchModal && <SearchModal mahlzeit={searchModal} user={user} onClose={() => setSearchModal(null)} onAdd={handleAdd} userIntolerances={settings.foodIntolerances} />}
      {showZiele && <ZieleEditor goals={goals} onSave={handleSaveGoals} onClose={() => setShowZiele(false)} />}
    </div>
  )
}
