import { supabase } from '../supabase'

function NavIcon({ id, size = 20, color = 'currentColor' }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (id) {
    case 'dashboard':
      return <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    case 'ernaehrung':
      return <svg {...props}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    case 'allergie':
      return <svg {...props}><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M2 12h10"/><path d="M12 2c2 2 3.5 5 3.5 10"/></svg>
    case 'supplements':
      return <svg {...props}><path d="M9 3h6v5a6 6 0 0 1-6 6V3z" fill="none"/><path d="M9 14a6 6 0 0 0 6 0"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="21" x2="15" y2="21"/><line x1="9" y1="6" x2="15" y2="6"/></svg>
    case 'trends':
      return <svg {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    case 'arzttermine':
      return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    case 'profil':
      return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    default:
      return null
  }
}

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',      mobile: 'Home'        },
  { id: 'ernaehrung',  label: 'Ernährung',      mobile: 'Ernährung'   },
  { id: 'allergie',    label: 'Allergie-Radar', mobile: 'Pollen'      },
  { id: 'supplements', label: 'Supplements',    mobile: 'Supps'       },
  { id: 'trends',      label: 'Trends',         mobile: 'Trends'      },
  { id: 'arzttermine', label: 'Arzttermine',    mobile: 'Termine'     },
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
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-[8px] transition-all"
                style={page === item.id ? {
                  background: 'rgba(255,255,255,0.1)',
                  color: '#F1F5F9',
                  fontWeight: 600,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                } : {
                  color: '#94A3B8',
                }}
              >
                <NavIcon id={item.id} size={16} />
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
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] transition-all"
            style={{
              color: page === item.id ? '#10B981' : '#475569',
              fontWeight: page === item.id ? 600 : 400,
              borderTop: `2px solid ${page === item.id ? '#10B981' : 'transparent'}`,
            }}
          >
            <NavIcon id={item.id} size={20} />
            {item.mobile}
          </button>
        ))}
      </nav>
    </div>
  )
}
