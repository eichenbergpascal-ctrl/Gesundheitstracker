import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleAnmelden(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleRegistrieren() {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setError('Bestätigungs-E-Mail wurde gesendet. Bitte prüfe dein Postfach.')
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', fontSize: 14,
    background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#F1F5F9', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#070B14',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow effects */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: 320, height: 320,
        background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', left: -60, width: 220, height: 220,
        background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '40px 28px', position: 'relative',
        maxWidth: 420, margin: '0 auto', width: '100%',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #10B981, #06B6D4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
            }}>
              <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
                <polyline points="2,13 5,7 9,15 13,5 17,13" stroke="#fff" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 28, fontWeight: 800, color: '#F1F5F9',
            margin: 0, letterSpacing: '-0.02em',
          }}>
            Vital<span style={{ color: '#10B981' }}>io</span>
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 8, lineHeight: 1.5 }}>
            Deine Gesundheit. Auf einen Blick.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAnmelden} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 6, display: 'block' }}>
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="deine@email.de"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#10B981'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 6, display: 'block' }}>
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#10B981'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, fontSize: 13,
              background: error.includes('gesendet') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${error.includes('gesendet') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
              color: error.includes('gesendet') ? '#10B981' : '#EF4444',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px 20px', marginTop: 4, fontSize: 14, fontWeight: 600,
              background: 'linear-gradient(135deg, #10B981, #06B6D4)',
              color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {loading ? '…' : 'Anmelden'}
          </button>
        </form>

        <button
          onClick={handleRegistrieren}
          disabled={loading}
          style={{
            marginTop: 10, padding: '14px 20px', fontSize: 14, fontWeight: 600,
            background: 'transparent', color: '#F1F5F9',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
            cursor: 'pointer', opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          Registrieren
        </button>

        <p style={{ fontSize: 11, color: '#334155', textAlign: 'center', marginTop: 24 }}>
          Deine Daten werden verschlüsselt gespeichert.
        </p>
      </div>
    </div>
  )
}
