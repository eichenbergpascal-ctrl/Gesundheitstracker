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
        <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
          <div className="text-center px-6">
            <p className="text-lg font-semibold text-[#1A1A1A] mb-2">Etwas ist schiefgelaufen.</p>
            <p className="text-sm text-[#6B6B6B] mb-4">Bitte lade die Seite neu.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#2D6A4F] text-white text-sm rounded-[10px] hover:bg-[#235C42] transition-colors"
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="text-5xl mb-4 animate-pulse">🌿</div>
          <p className="text-sm">Gesundheitstracker lädt…</p>
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
