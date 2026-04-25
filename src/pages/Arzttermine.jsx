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

const glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '14px 16px',
}

const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10, color: '#F1F5F9', outline: 'none',
  boxSizing: 'border-box',
}

function TerminCard({ termin, onToggle, onDelete, upcoming: isUpcomingCard }) {
  return (
    <div style={{
      ...glass,
      ...(isUpcomingCard
        ? { background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }
        : { opacity: 0.5 }),
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <button
          onClick={() => onToggle(termin)}
          style={{
            marginTop: 2, width: 20, height: 20, borderRadius: '50%',
            border: termin.erledigt
              ? 'none'
              : `2px solid ${isUpcomingCard ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.15)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, cursor: 'pointer',
            background: termin.erledigt
              ? 'linear-gradient(135deg, #10B981, #06B6D4)'
              : 'transparent',
            boxShadow: (isUpcomingCard && !termin.erledigt)
              ? '0 0 0 3px rgba(16,185,129,0.1)'
              : 'none',
            transition: 'all 0.2s',
          }}
        >
          {termin.erledigt && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 600, margin: 0,
            color: termin.erledigt ? '#475569' : '#F1F5F9',
            textDecoration: termin.erledigt ? 'line-through' : 'none',
          }}>
            {termin.titel}
          </p>
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
              <span style={{ color: '#475569' }}>Datum: </span>{formatDate(termin.datum)}
              {termin.uhrzeit && (
                <span style={{ marginLeft: 10 }}>
                  <span style={{ color: '#475569' }}>Uhrzeit: </span>{termin.uhrzeit} Uhr
                </span>
              )}
            </p>
            {termin.arzt && (
              <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
                <span style={{ color: '#475569' }}>Arzt: </span>{termin.arzt}
              </p>
            )}
          </div>
          {termin.notizen && (
            <p style={{
              fontSize: 11, color: '#475569', marginTop: 6, marginBottom: 0,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {termin.notizen}
            </p>
          )}
        </div>
        <button
          onClick={() => onDelete(termin.id)}
          style={{
            color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.target.style.color = '#EF4444'}
          onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.2)'}
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
      .eq('user_id', user.id)
    if (error) {
      setTermine(previous)
      setDbError('Termin konnte nicht aktualisiert werden.')
    }
  }

  async function handleDelete(id) {
    const previous = termine
    setTermine(prev => prev.filter(t => t.id !== id))
    setDbError(null)
    const { error } = await supabase.from('appointments').delete().eq('id', id).eq('user_id', user.id)
    if (error) {
      setTermine(previous)
      setDbError('Termin konnte nicht gelöscht werden.')
    }
  }

  const upcoming = termine.filter(t => isUpcoming(t.datum) && !t.erledigt)
  const past = termine.filter(t => !isUpcoming(t.datum) || t.erledigt)

  const focusInput = e => e.target.style.borderColor = '#10B981'
  const blurInput = e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'

  return (
    <div style={{ background: '#0F172A', minHeight: '100%' }}>
      <div style={{ padding: '16px 18px 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', margin: 0 }}>Arzttermine</h1>
        <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, marginBottom: 0 }}>
          {upcoming.length} bevorstehend
        </p>
      </div>

      <div style={{ padding: '8px 14px 80px' }}>
        {dbError && (
          <div style={{
            marginBottom: 14, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 13, color: '#EF4444' }}>{dbError}</span>
            <button onClick={() => setDbError(null)} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div />
          <button
            onClick={() => setShowForm(s => !s)}
            style={{
              background: 'linear-gradient(135deg, #10B981, #06B6D4)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            }}
          >
            + Neuer Termin
          </button>
        </div>

        {showForm && (
          <div style={{
            background: 'rgba(16,185,129,0.05)',
            border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: 16, padding: 18, marginBottom: 16,
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#34D399', marginBottom: 16, marginTop: 0 }}>
              Neuer Arzttermin
            </h3>
            <form onSubmit={handleSave}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 5 }}>Titel *</label>
                  <input
                    value={form.titel}
                    onChange={e => setForm(f => ({ ...f, titel: e.target.value }))}
                    placeholder="z.B. Hausarzt – Vorsorge"
                    required
                    style={inputStyle}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 5 }}>Datum *</label>
                    <input
                      type="date"
                      value={form.datum}
                      onChange={e => setForm(f => ({ ...f, datum: e.target.value }))}
                      required
                      style={inputStyle}
                      onFocus={focusInput}
                      onBlur={blurInput}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 5 }}>Uhrzeit</label>
                    <input
                      type="time"
                      value={form.uhrzeit}
                      onChange={e => setForm(f => ({ ...f, uhrzeit: e.target.value }))}
                      style={inputStyle}
                      onFocus={focusInput}
                      onBlur={blurInput}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 5 }}>Arzt / Klinik</label>
                  <input
                    value={form.arzt}
                    onChange={e => setForm(f => ({ ...f, arzt: e.target.value }))}
                    placeholder="Dr. Müller, Facharzt für …"
                    style={inputStyle}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 5 }}>Notizen</label>
                  <textarea
                    value={form.notizen}
                    onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))}
                    placeholder="Beschwerden, Fragen für den Arzt …"
                    rows={2}
                    style={{ ...inputStyle, resize: 'none' }}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                      background: saving ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg, #10B981, #06B6D4)',
                      color: '#fff', border: 'none', borderRadius: 10,
                      cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {saving ? 'Speichern …' : 'Termin speichern'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{
                      padding: '10px 16px', fontSize: 13, fontWeight: 500,
                      background: 'transparent', color: '#94A3B8',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, cursor: 'pointer',
                    }}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {upcoming.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#94A3B8', marginBottom: 10, marginTop: 0,
            }}>
              Bevorstehend
            </p>
            {/* Timeline */}
            <div style={{ position: 'relative', paddingLeft: 20 }}>
              {upcoming.length > 1 && (
                <div style={{
                  position: 'absolute', left: 5, top: 12, bottom: 12,
                  width: 1, background: 'rgba(16,185,129,0.2)',
                }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map((t, i) => (
                  <div key={t.id} style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: -20, top: 14, width: 12, height: 12,
                      borderRadius: '50%', border: '2px solid #10B981',
                      background: '#0F172A',
                      boxShadow: '0 0 8px rgba(16,185,129,0.4)',
                    }} />
                    <TerminCard termin={t} onToggle={toggleErledigt} onDelete={handleDelete} upcoming={true} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <p style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: '#475569', marginBottom: 10, marginTop: 0,
            }}>
              Vergangen / Erledigt
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {past.map(t => (
                <TerminCard key={t.id} termin={t} onToggle={toggleErledigt} onDelete={handleDelete} upcoming={false} />
              ))}
            </div>
          </div>
        )}

        {termine.length === 0 && !showForm && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
            <p style={{ fontSize: 13 }}>Noch keine Arzttermine eingetragen.</p>
          </div>
        )}
      </div>
    </div>
  )
}
