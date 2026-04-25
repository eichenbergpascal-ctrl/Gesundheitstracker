import { useState, useEffect, Component } from 'react'
import { supabase } from './supabase'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AllergieRadar from './pages/AllergieRadar'
import ErnaehrungsCheck from './pages/ErnaehrungsCheck'
import Arzttermine from './pages/Arzttermine'
import Supplements from './pages/Supplements'
import Trends from './pages/Trends'
import Profil from './pages/Profil'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
          <div style={{ textAlign: 'center', padding: '0 24px' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#F1F5F9', marginBottom: 8 }}>Etwas ist schiefgelaufen.</p>
            <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 16 }}>Bitte lade die Seite neu.</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px', background: 'linear-gradient(135deg, #10B981, #06B6D4)',
                color: '#fff', fontSize: 14, fontWeight: 600, borderRadius: 12, border: 'none', cursor: 'pointer',
              }}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A' }}>
        <div style={{ textAlign: 'center', color: '#94A3B8' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #10B981, #06B6D4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', animation: 'pulse 2s infinite',
          }}>
            <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
              <polyline points="2,13 5,7 9,15 13,5 17,13" stroke="#fff" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p style={{ fontSize: 14 }}>Vitalio lädt…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  const pages = {
    dashboard: <Dashboard user={user} setPage={setPage} />,
    allergie: <AllergieRadar user={user} />,
    ernaehrung: <ErnaehrungsCheck user={user} />,
    arzttermine: <Arzttermine user={user} />,
    supplements: <Supplements user={user} />,
    trends: <Trends user={user} />,
    profil: <Profil user={user} />,
  }

  return (
    <ErrorBoundary>
      <Layout user={user} page={page} setPage={setPage}>
        {pages[page]}
      </Layout>
    </ErrorBoundary>
  )
}
