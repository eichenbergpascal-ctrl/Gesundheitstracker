import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  })
}

function isUpcoming(dateStr) {
  return dateStr >= today()
}

function TerminCard({ termin, onToggle, onDelete }) {
  return (
    <div className={`bg-white rounded-[14px] p-4 border ${termin.erledigt ? 'border-[#E8E6E1] opacity-60' : 'border-[#E8E6E1]'}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(termin)}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            termin.erledigt
              ? 'bg-[#2D6A4F] border-[#2D6A4F] text-white'
              : 'border-[#CFCCC5] hover:border-[#2D6A4F]'
          }`}
        >
          {termin.erledigt && <span className="text-xs">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${termin.erledigt ? 'line-through text-[#A8A8A8]' : 'text-[#1A1A1A]'}`}>
            {termin.titel}
          </p>
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-[#6B6B6B]">
              <span className="text-[#A8A8A8]">Datum: </span>{formatDate(termin.datum)}
              {termin.uhrzeit && <span className="ml-2"><span className="text-[#A8A8A8]">Uhrzeit: </span>{termin.uhrzeit} Uhr</span>}
            </p>
            {termin.arzt && (
              <p className="text-xs text-[#6B6B6B]"><span className="text-[#A8A8A8]">Arzt: </span>{termin.arzt}</p>
            )}
          </div>
          {termin.notizen && (
            <p className="text-xs text-[#A8A8A8] mt-1 line-clamp-2">{termin.notizen}</p>
          )}
        </div>
        <button
          onClick={() => onDelete(termin.id)}
          className="text-[#CFCCC5] hover:text-[#991B1B] transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default function Arzttermine({ user }) {
  const [termine, setTermine] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titel: '', datum: today(), uhrzeit: '', arzt: '', notizen: '' })
  const [saving, setSaving] = useState(false)
  const [dbError, setDbError] = useState(null)

  async function fetchTermine() {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('datum')
    setTermine((data ?? []).map(t => ({ ...t, erledigt: t.abgeschlossen })))
  }

  useEffect(() => {
    fetchTermine()
    const channel = supabase
      .channel('appointments')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchTermine())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user.id])

  async function handleSave(e) {
    e.preventDefault()
    if (!form.titel.trim() || !form.datum) return
    setSaving(true)
    await supabase.from('appointments').insert({ user_id: user.id, ...form, abgeschlossen: false })
    setForm({ titel: '', datum: today(), uhrzeit: '', arzt: '', notizen: '' })
    setShowForm(false)
    setSaving(false)
  }

  async function toggleErledigt(termin) {
    const previous = termine
    setTermine(prev => prev.map(t =>
      t.id === termin.id ? { ...t, erledigt: !t.erledigt, abgeschlossen: !t.erledigt } : t
    ))
    setDbError(null)
    const { error } = await supabase
      .from('appointments')
      .update({ abgeschlossen: !termin.erledigt })
      .eq('id', termin.id)
    if (error) {
      setTermine(previous)
      setDbError('Termin konnte nicht aktualisiert werden.')
    }
  }

  async function handleDelete(id) {
    const previous = termine
    setTermine(prev => prev.filter(t => t.id !== id))
    setDbError(null)
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) {
      setTermine(previous)
      setDbError('Termin konnte nicht gelöscht werden.')
    }
  }

  const upcoming = termine.filter(t => isUpcoming(t.datum) && !t.erledigt)
  const past = termine.filter(t => !isUpcoming(t.datum) || t.erledigt)

  return (
    <div className="px-4 py-5 md:px-8 md:py-7 max-w-5xl mx-auto w-full pb-24 md:pb-6">
      {dbError && (
        <div className="mb-4 px-4 py-2.5 rounded-[10px] bg-red-50 border border-red-200 flex items-center justify-between">
          <span className="text-sm text-[#991B1B]">{dbError}</span>
          <button onClick={() => setDbError(null)} className="text-[#991B1B] text-lg leading-none ml-3">×</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Arzttermine</h1>
          <p className="text-sm text-[#6B6B6B]">{upcoming.length} bevorstehend</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-[#2D6A4F] text-white text-sm font-medium px-4 py-2 rounded-[10px] hover:bg-[#235C42] transition-colors"
        >
          + Neuer Termin
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-[#E8F0EC] border border-[#2D6A4F] border-opacity-20 rounded-[14px] p-5 mb-5 space-y-3"
        >
          <h3 className="text-sm font-semibold text-[#2D6A4F]">Neuer Arzttermin</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-[#6B6B6B] mb-1 block">Titel *</label>
              <input
                value={form.titel}
                onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
                placeholder="z.B. Hausarzt – Vorsorge"
                required
                className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B6B6B] mb-1 block">Datum *</label>
              <input
                type="date"
                value={form.datum}
                onChange={e => setForm(f => ({ ...f, datum: e.target.value }))}
                required
                className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B6B6B] mb-1 block">Uhrzeit</label>
              <input
                type="time"
                value={form.uhrzeit}
                onChange={e => setForm(f => ({ ...f, uhrzeit: e.target.value }))}
                className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-[#6B6B6B] mb-1 block">Arzt / Klinik</label>
              <input
                value={form.arzt}
                onChange={e => setForm(f => ({ ...f, arzt: e.target.value }))}
                placeholder="Dr. Müller, Facharzt für …"
                className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-[#6B6B6B] mb-1 block">Notizen</label>
              <textarea
                value={form.notizen}
                onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))}
                placeholder="Beschwerden, Fragen für den Arzt …"
                rows={2}
                className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#2D6A4F] text-white text-sm font-medium py-2 rounded-[10px] hover:bg-[#235C42] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Speichern …' : 'Termin speichern'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] rounded-[10px] border border-[#CFCCC5] bg-white"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {upcoming.length > 0 && (
        <div className="mb-5 space-y-2">
          <h3 className="text-xs font-semibold text-[#A8A8A8] uppercase tracking-wide">Bevorstehend</h3>
          {upcoming.map(t => (
            <TerminCard key={t.id} termin={t} onToggle={toggleErledigt} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[#A8A8A8] uppercase tracking-wide">Vergangen / Erledigt</h3>
          {past.map(t => (
            <TerminCard key={t.id} termin={t} onToggle={toggleErledigt} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {termine.length === 0 && !showForm && (
        <div className="text-center py-12 text-[#A8A8A8]">
          <p className="text-sm">Noch keine Arzttermine eingetragen.</p>
        </div>
      )}
    </div>
  )
}
