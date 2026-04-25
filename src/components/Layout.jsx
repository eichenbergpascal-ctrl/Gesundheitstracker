import { supabase } from '../supabase'

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',      mobile: 'Home'        },
  { id: 'allergie',    label: 'Allergie-Radar', mobile: 'Pollen'      },
  { id: 'ernaehrung',  label: 'Ernährung',      mobile: 'Ernährung'   },
  { id: 'arzttermine', label: 'Arzttermine',    mobile: 'Termine'     },
  { id: 'supplements', label: 'Supplements',    mobile: 'Supp.'       },
  { id: 'trends',      label: 'Trends',         mobile: 'Trends'      },
  { id: 'profil',      label: 'Profil',         mobile: 'Profil'      },
]

function VitalioLogo() {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: 'linear-gradient(135deg, #10B981, #06B6D4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
      }}>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <polyline points="2,13 5,7 9,15 13,5 17,13" stroke="#fff" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <span className="font-bold text-lg leading-none" style={{ color: '#F1F5F9' }}>
        Vital<span style={{ color: '#10B981' }}>io</span>
      </span>
    </div>
  )
}

export default function Layout({ user, page, setPage, children }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex flex-col min-h-screen w-full" style={{ background: '#0F172A' }}>

      {/* ── Desktop Top-Bar ──────────────────────────────────────────────── */}
      <header className="hidden md:flex items-center h-14 px-6 shrink-0" style={{
        background: 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <VitalioLogo />

        <div className="flex-1 flex justify-center">
          <nav className="flex gap-1 p-1 rounded-[10px]" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className="px-4 py-1.5 text-sm rounded-[8px] transition-all"
                style={page === item.id ? {
                  background: 'rgba(255,255,255,0.1)',
                  color: '#F1F5F9',
                  fontWeight: 600,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                } : {
                  color: '#94A3B8',
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center">
          <span className="text-xs truncate max-w-[160px]" style={{ color: '#94A3B8' }}>
            {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="ml-3 text-xs transition-colors whitespace-nowrap"
            style={{ color: '#475569' }}
            onMouseEnter={e => e.target.style.color = '#EF4444'}
            onMouseLeave={e => e.target.style.color = '#475569'}
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* ── Mobile Top-Header ────────────────────────────────────────────── */}
      <header className="md:hidden flex items-center h-12 px-4 shrink-0" style={{
        background: 'rgba(15,23,42,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <VitalioLogo />
      </header>

      {/* ── Page Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0" style={{ background: '#0F172A' }}>
        {children}
      </main>

      {/* ── Mobile Bottom-Navigation ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex" style={{
        background: 'rgba(7,11,20,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className="flex-1 flex flex-col items-center justify-center py-3 text-xs transition-all"
            style={{
              color: page === item.id ? '#10B981' : '#475569',
              fontWeight: page === item.id ? 600 : 400,
              borderTop: `2px solid ${page === item.id ? '#10B981' : 'transparent'}`,
            }}
          >
            {item.mobile}
          </button>
        ))}
      </nav>
    </div>
  )
}
