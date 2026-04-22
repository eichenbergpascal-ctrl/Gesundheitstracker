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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
      <div className="bg-white rounded-[14px] border border-[#E8E6E1] p-10 max-w-sm w-full mx-4 text-center">
        <h1 className="text-[22px] font-bold text-[#1A1A1A] mb-2">Gesundheitstracker</h1>
        <p className="text-[#6B6B6B] mb-8 text-sm">
          Pollen, Luftqualität, Ernährung und Termine – alles an einem Ort.
        </p>
        <form onSubmit={handleAnmelden} className="space-y-3 text-left mb-3">
          <div>
            <label className="text-xs text-[#6B6B6B] block mb-1">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="deine@email.de"
              className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>
          <div>
            <label className="text-xs text-[#6B6B6B] block mb-1">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-[#E8E6E1] rounded-[10px] px-3 py-2 text-sm bg-[#FAFAF9] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>
          {error && (
            <p className="text-xs text-[#991B1B] bg-red-50 rounded-[10px] px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2D6A4F] text-white font-semibold py-3 px-6 rounded-[10px] hover:bg-[#235C42] disabled:opacity-50 transition-colors"
          >
            {loading ? '…' : 'Anmelden'}
          </button>
        </form>
        <button
          onClick={handleRegistrieren}
          disabled={loading}
          className="w-full bg-white border border-[#CFCCC5] text-[#1A1A1A] font-medium py-3 px-6 rounded-[10px] hover:bg-[#F2F1EE] disabled:opacity-50 transition-colors"
        >
          Registrieren
        </button>
        <p className="text-xs text-[#A8A8A8] mt-6">
          Deine Daten werden sicher in Supabase gespeichert.
        </p>
      </div>
    </div>
  )
}
