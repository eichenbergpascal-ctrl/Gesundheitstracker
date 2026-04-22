import { supabase } from '../supabase'

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',      mobile: 'Home'        },
  { id: 'allergie',    label: 'Allergie-Radar', mobile: 'Pollen'      },
  { id: 'ernaehrung',  label: 'Ernährung',      mobile: 'Ernährung'   },
  { id: 'arzttermine', label: 'Arzttermine',    mobile: 'Termine'     },
  { id: 'supplements', label: 'Supplements',    mobile: 'Supplements' },
  { id: 'trends',      label: 'Trends',         mobile: 'Trends'      },
  { id: 'profil',      label: 'Profil',         mobile: 'Profil'      },
]

function VitalioLogo() {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path
          d="M14 4 C6 4 4 12 4 16 C4 22 9 25 14 24 C19 25 24 22 24 16 C24 12 22 4 14 4Z"
          fill="#2D6A4F" opacity="0.15" stroke="#2D6A4F" strokeWidth="1.5"
        />
        <polyline
          points="7,16 10,11 13,18 16,10 19,16"
          stroke="#2D6A4F" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" fill="none"
        />
      </svg>
      <span className="font-bold text-lg text-[#1A1A1A] leading-none">
        Vit<span style={{ color: '#2D6A4F' }}>alio</span>
      </span>
    </div>
  )
}

export default function Layout({ user, page, setPage, children }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex flex-col min-h-screen w-full">

      {/* ── Desktop Top-Bar ──────────────────────────────────────────────── */}
      <header className="hidden md:flex items-center h-14 px-6 bg-white border-b border-[#E8E6E1] shrink-0">

        {/* Links: Logo */}
        <VitalioLogo />

        {/* Mitte: Nav-Tabs */}
        <div className="flex-1 flex justify-center">
          <nav className="flex gap-1 p-1 bg-[#F2F1EE] rounded-[10px]">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`px-4 py-1.5 text-sm rounded-[8px] transition-colors ${
                  page === item.id
                    ? 'bg-white text-[#1A1A1A] font-semibold shadow-sm'
                    : 'text-[#6B6B6B] hover:text-[#1A1A1A]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Rechts: User */}
        <div className="flex items-center">
          <span className="text-xs text-[#6B6B6B] truncate max-w-[160px]">
            {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="ml-3 text-xs text-[#A8A8A8] hover:text-[#991B1B] transition-colors whitespace-nowrap"
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* ── Mobile Top-Header ────────────────────────────────────────────── */}
      <header className="md:hidden flex items-center h-12 px-4 bg-white border-b border-[#E8E6E1] shrink-0">
        <VitalioLogo />
      </header>

      {/* ── Page Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-[#F8F7F4] pb-16 md:pb-0">
        {children}
      </main>

      {/* ── Mobile Bottom-Navigation ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-white border-t border-[#E8E6E1]">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 text-xs border-t-2 transition-colors ${
              page === item.id
                ? 'text-[#2D6A4F] font-semibold border-[#2D6A4F]'
                : 'text-[#A8A8A8] border-transparent'
            }`}
          >
            {item.mobile}
          </button>
        ))}
      </nav>
    </div>
  )
}
