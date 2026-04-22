# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, localhost:5173)
npm run build     # Production build → dist/
npm run lint      # ESLint
npm run preview   # Preview production build
```

No test suite is configured.

## Environment

Create a `.env` file at the project root with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Stack

- **React 19** + **Vite 8** — JSX only, no TypeScript
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin)
- **Supabase** — auth, Postgres, real-time subscriptions
- **Recharts** — charts in AllergieRadar and Trends
- **Open-Meteo APIs** — air quality, UV, weather forecast (no API key)
- **Nominatim** (OpenStreetMap) — reverse geocoding

## Architecture

`App.jsx` owns auth state and the active `page` string. It renders `<Layout>` with the current page component as `children`. Navigation is flat — no router, just `setPage(id)`.

**Layout** (`src/components/Layout.jsx`): desktop top-bar + mobile bottom-nav. Nav items are defined in a `NAV_ITEMS` array; adding a new page requires adding an entry there and a corresponding entry in `App.jsx`'s `pages` object.

**Supabase tables used:**
| Table | Purpose |
|---|---|
| `user_settings` | Allergies, nutrition goals, profile (gender, DOB, height, weight, activity, diet style) |
| `nutrition_log` | Daily food items per user (`date`, `items` JSON array) |
| `supplements` | User supplements with `zeitpunkt_neu`, `haeufigkeit`, `letztes_nehmen` |
| `appointments` | Doctor appointments (`abgeschlossen` bool) |
| `daily_health_log` | Daily score snapshots (`health_score`, `aqi`, `uv_max`) |

**`useUserSettings(userId)`** (`src/hooks/useUserSettings.js`): fetches/upserts `user_settings`. The DB column names differ from app field names — `fromDb`/`toDb` handle the mapping. Returns `{ settings, updateSettings, loading }`.

**`src/services/openMeteo.js`**: all Open-Meteo calls plus pure helper functions (`getDailyMaxValues`, `calculateHealthScore`, label functions). `fetchWeatherData` uses `forecast_days=2` for current conditions + hourly preview; `fetchAirQualityData` uses `forecast_days=7` for pollen charts.

**`src/services/supplementGuide.js`**: pure function `analyzeSupplements({...})` — takes aggregated user stats, returns ranked supplement suggestions with `defaultZeitpunkt` / `defaultHaeufigkeit`. Filters out supplements already being tracked.

**Supplements scheduling logic**: supplements have `haeufigkeit` values `taeglich` / `jeden_2_tag` / `woechentlich`. The Supplements page uses `letztes_nehmen` delta to decide if due today (`isHeuteFaellig`). The Dashboard uses a simpler `created_at`-based modulo approach (`suppIsHeuteFaellig`) for read-only display.

**`useGeolocation`** falls back to Berlin (52.52, 13.405) on denial or timeout.

## Conventions

- All user-facing text is in **German**
- No icons or emojis in the UI (except the loading spinner in App.jsx)
- Color palette: `#1A1A1A` (text), `#6B6B6B` (secondary), `#A8A8A8` (muted), `#2D6A4F` (primary green), `#E8E6E1` (border), `#F8F7F4` (page background)
- Page container pattern: `"px-4 py-5 md:px-8 md:py-7 max-w-5xl mx-auto w-full pb-24 md:pb-6"`
- Card pattern: `"bg-white rounded-[14px] p-4 border border-[#E8E6E1]"`
- Supabase real-time: pages subscribe to their table in `useEffect` and unsubscribe on cleanup via `supabase.removeChannel(channel)`

## Code Quality & Bug Prevention

When writing or modifying code in this project, always check for the following patterns. These were identified as real bugs or recurring issues in this codebase.

### Supabase mutations — always handle errors and roll back optimistic updates

Every `supabase.from(...).update/delete/insert` call must have error handling. If the UI is updated optimistically before the DB call, roll back on failure.

```js
// WRONG
async function toggleHeute(supp) {
  setSupplements(prev => prev.map(...)) // optimistic update
  await supabase.from('supplements').update({...}).eq('id', supp.id) // no error handling
}

// CORRECT
async function toggleHeute(supp) {
  const previous = supplements
  setSupplements(prev => prev.map(...)) // optimistic update
  const { error } = await supabase.from('supplements').update({...}).eq('id', supp.id)
  if (error) {
    setSupplements(previous) // roll back
    console.error(error)
  }
}
```

### `?? 0` does not protect against NaN — use `|| 0` for numeric fields

`Number(undefined) = NaN` and `NaN ?? 0 = NaN` (because `??` only catches `null`/`undefined`).

```js
// WRONG
protein: Number(food.protein) ?? 0

// CORRECT
protein: Number(food.protein) || 0
```

### Never define React components inside other components

Components defined inside a render function get a new reference on every render, causing React to unmount and remount them unnecessarily.

```js
// WRONG — NutritionPreview is re-created on every render of SearchModal
export default function SearchModal() {
  function NutritionPreview({ food, amount }) { ... }
  return <NutritionPreview ... />
}

// CORRECT — defined at module level
function NutritionPreview({ food, amount }) { ... }
export default function SearchModal() {
  return <NutritionPreview ... />
}
```

### Always clean up setTimeout / setInterval

Store the timer ID and clear it in the cleanup function to avoid state updates on unmounted components.

```js
// WRONG
useEffect(() => { setTimeout(() => ref.current?.focus(), 100) }, [])

// CORRECT
useEffect(() => {
  const t = setTimeout(() => ref.current?.focus(), 100)
  return () => clearTimeout(t)
}, [])
```

### Avoid arrays/objects as useEffect dependencies — use stable primitives

Arrays and objects use reference equality. A new array reference on each render will cause the effect to run on every render.

```js
// RISKY — selectedAllergies is an array; new reference = effect re-runs
useEffect(() => { ... }, [location, user.id, settings.selectedAllergies])

// SAFER — serialize to a stable string, or use a specific primitive
const allergiesKey = settings.selectedAllergies.join(',')
useEffect(() => { ... }, [location, user.id, allergiesKey])
```

### Guard against division by zero in CalorieRing and similar calculations

```js
// WRONG — goal=0 gives Infinity → Math.min(Infinity, 1) = 1 → ring shows 100%
const pct = Math.min(consumed / goal, 1)

// CORRECT
const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0
```

### String matching in supplementGuide — use full name, not just first word

`isAlreadyTracked` currently compares only the first word of a supplement name. This causes "Vitamin B12" to be suppressed when "Vitamin D3" is already tracked.

```js
// WRONG — matches "Vitamin" D3 and "Vitamin" B12 as the same
const key = suggName.split(' ')[0].toLowerCase()

// CORRECT — compare the full name
const key = suggName.toLowerCase()
return existingSupps.some(s => s.toLowerCase().includes(key))
```

### Keep dead code out of the project

`src/services/openFoodFacts.js` is no longer imported anywhere — `SearchModal` and `NutriScoreBadge` both import from `src/services/foods.js`. Do not add new imports from `openFoodFacts.js`; the file should be removed.
