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

const glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 20,
}

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
      .from('nutrition_log').select('*').eq('user_id', user.id).eq('date', selectedDate).maybeSingle()
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
      user_id: user.id, date: selectedDate, items: newLog,
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

  const navBtnStyle = (enabled) => ({
    width: 32, height: 32, borderRadius: '50%', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: enabled ? 'pointer' : 'not-allowed',
    background: enabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
    color: enabled ? '#94A3B8' : '#334155',
    fontSize: 16, fontWeight: 700, transition: 'background 0.2s',
  })

  return (
    <div style={{ background: '#0F172A', minHeight: '100%' }}>

      {/* Header-Band mit Gradient */}
      <div style={{
        background: 'linear-gradient(180deg, #0F172A 0%, #0D2137 60%, #0F172A 100%)',
        padding: '0 18px 24px',
      }}>
        {/* Datum-Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={handlePrevDay} disabled={!canGoPrev} style={navBtnStyle(canGoPrev)} aria-label="Vorheriger Tag">‹</button>
            <div style={{ textAlign: 'center', minWidth: 0 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9', margin: 0, lineHeight: 1 }}>
                {dayLabel(selectedDate)}
              </h1>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>{formatDate(selectedDate)}</p>
            </div>
            <button onClick={handleNextDay} disabled={!canGoNext} style={navBtnStyle(canGoNext)} aria-label="Nächster Tag">›</button>
          </div>
          <button
            onClick={() => setShowZiele(true)}
            style={{ fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Ziele anpassen
          </button>
        </div>

        {dbError && (
          <div style={{
            marginBottom: 12, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, color: '#EF4444' }}>{dbError}</span>
            <button onClick={() => setDbError(null)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
        )}

        {/* Kalorie Ring Hero */}
        {!loadingLog && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CalorieRing consumed={totals.kcal} goal={goals.kcal} />
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              {[
                { label: 'Gegessen', color: '#10B981' },
                { label: 'Verbleibend', color: 'rgba(255,255,255,0.15)' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                  <span style={{ fontSize: 10, color: '#94A3B8' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '0 14px 80px' }}>

        {loadingLog ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: '#475569' }}>
            <p style={{ fontSize: 14 }}>Lädt…</p>
          </div>
        ) : (
          <>
            {/* Makros */}
            <div style={{
              ...glass,
              marginBottom: 12,
            }}>
              <p style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#94A3B8', marginBottom: 14, marginTop: 0,
              }}>
                Makronährstoffe
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MACRO_CONFIG.map(m => (
                  <MacroBar key={m.key} label={m.label} consumed={totals[m.key]} goal={goals[m.key]} color={m.color} />
                ))}
              </div>
            </div>

            {/* Mahlzeiten */}
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#94A3B8', marginBottom: 10, marginTop: 4,
            }}>
              Mahlzeiten
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
      </div>

      {searchModal && (
        <SearchModal
          mahlzeit={searchModal} user={user}
          onClose={() => setSearchModal(null)}
          onAdd={handleAdd}
          userIntolerances={settings.foodIntolerances}
        />
      )}
      {showZiele && (
        <ZieleEditor goals={goals} onSave={handleSaveGoals} onClose={() => setShowZiele(false)} />
      )}
    </div>
  )
}
