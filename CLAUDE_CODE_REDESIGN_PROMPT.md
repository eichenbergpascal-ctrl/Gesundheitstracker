# Vitalio Redesign — Prompt für Claude Code

Kopiere alles ab hier in Claude Code:

---

Ich habe ein komplettes Redesign für meine Vitalio Gesundheitstracker-App erstellen lassen. Die Design-Referenzdateien liegen in `design-reference/`. Diese Dateien sind KEINE Code-Dateien die ins Projekt kommen — sie sind **reine visuelle Referenzen** (Mockups als React-Komponenten mit Inline-Styles und Mock-Daten). Deine Aufgabe ist es, das bestehende Design meiner App so umzubauen, dass es dem neuen Design entspricht.

## Design-Referenzdateien

- `design-reference/vitalio-tokens.jsx` — **Das Design-System**: Komplette Farbpalette, Tokens, und Shared Components (VCard, VButton, VBadge, VProgress, VScoreRing). Das ist die wichtigste Datei — hier sind alle Farben, Schatten, Radien, Fonts und Glassmorphism-Effekte definiert.
- `design-reference/vitalio-dashboard.jsx` — Dashboard + Login Seite
- `design-reference/vitalio-pages-1.jsx` — Ernährung + Allergie-Radar
- `design-reference/vitalio-pages-2.jsx` — Supplements + Trends
- `design-reference/vitalio-pages-3.jsx` — Arzttermine + Profil

## Was sich ändern soll

### 1. Globales Design-System
- **Dark Theme**: Hintergrund wechselt von `#F8F7F4` (hell) zu `#0F172A` (dunkel)
- **Neue Farbpalette** (aus vitalio-tokens.jsx):
  - Primary: `#10B981` (Emerald) statt `#2D6A4F`
  - Accent: `#6366F1` (Indigo) + `#8B5CF6` (Violet)
  - Cyan: `#06B6D4` für Sekundär-Akzente
  - Semantic: Good `#10B981`, Medium `#F59E0B`, Bad `#EF4444`
  - Dark Surfaces: `#070B14`, `#0F172A`, `#1E293B`, `#334155`
  - Text: `#F1F5F9` (primary), `#94A3B8` (muted), `#475569` (body)
- **Fonts**: `Plus Jakarta Sans` als Hauptfont, `JetBrains Mono` für Zahlen/Daten — beide über Google Fonts einbinden
- **Glassmorphism-Cards**: `background: rgba(255,255,255,0.05)`, `backdrop-filter: blur(20px)`, `border: 1px solid rgba(255,255,255,0.08)`
- **Gradienten**: Primary `linear-gradient(135deg, #10B981, #06B6D4)`, Accent `linear-gradient(135deg, #6366F1, #8B5CF6)`
- **Shadows**: Mehrstufig, z.B. `0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)`
- **Border-Radius**: 8px, 12px, 16px, 20px je nach Komponente

### 2. Hover-Effekte & Animationen
- **Cards**: `hover:translateY(-2px) scale(1.01)` + stärkerer Shadow, `transition: all 0.25s cubic-bezier(.4,0,.2,1)`
- **Buttons**: `active:scale(0.96)` Press-Effekt
- **Checkboxen**: Spring-Animation `cubic-bezier(.175,.885,.32,1.275)` beim Checken
- **Progress-Bars**: Smooth fill mit `transition: width 0.8s cubic-bezier(.4,0,.2,1)`
- **Score-Ring**: Animierte stroke-dasharray beim Laden (1.2s ease)
- **Chevrons**: Rotation-Animation bei Expand/Collapse

### 3. Layout & Navigation
- **Navigation** bekommt Dark-Theme Styling (dunkler Hintergrund, Glass-Effekte)
- **Hero-Sections**: Dashboard und Ernährung haben einen dunklen Gradient-Header (`linear-gradient(180deg, #0F172A 0%, #0D2137 50%, #0F172A 100%)`) mit Ambient-Glow-Effekten (radial-gradient Kreise)
- **Mobile Bottom-Nav**: Dunkler Hintergrund, aktiver Tab mit Emerald-Farbe

### 4. Seiten-spezifische Änderungen

**Dashboard:**
- Greeting mit Name und Datum oben
- Score-Ring als Hero-Element mit Gradient-Stroke und Sub-Scores (Ernährung, Supplements, Umwelt)
- Kalorien + Supplements als Glass-Cards im 2er-Grid mit Glow-Effekten
- Supplement-Checklist als eigene Glass-Card
- "Was heute zählt" Sektion mit farbigen Punkten

**Login:**
- Full-Dark-Screen mit Ambient-Glow-Effekten im Hintergrund
- Gradient-Logo-Icon
- Dark Input-Felder mit Focus-Border-Animation
- Gradient Primary-Button

**Ernährung:**
- Calorie-Ring mit Gradient-Stroke (Emerald → Cyan)
- Makro-Bars mit individuellen Gradienten (Protein: Violet→Indigo, KH: Amber→Yellow, Fett: Cyan→Teal)
- Meal-Cards als Glass-Cards mit Icons und Expand-Animation

**Allergie-Radar:**
- Wetter-Card als Hero mit Cyan-Gradient-Background und stündlicher Vorschau
- AQI + UV als Glass-Cards im 2er-Grid
- Pollen-Bars mit farbcodierten Leveln und Badges

**Supplements:**
- Tab-Switcher mit Glass-Effekt
- Streak-Card mit Gradient-Background und Glow
- Supplement-Cards mit Indigo-Highlight wenn gecheckt
- Guide-Cards mit Priority-Badges

**Trends:**
- Mini-Charts mit Gradient-Fill unter der Linie
- Forecast-Bars mit farbcodierten Gradienten
- Durchschnitts-Score als kompakte Ring+Text Kombination

**Arzttermine:**
- Timeline-Darstellung mit Dots und vertikaler Linie
- Upcoming-Cards mit Cyan-Tint, vergangene mit reduzierter Opacity

**Profil:**
- Glass-Cards pro Sektion
- Chip-Select Buttons mit farbigen Borders wenn aktiv
- BMI-Display mit Emerald-Highlight
- Kalorienbedarf als Gradient-Card

## Wichtige Regeln

1. **Nur das Styling ändern** — die Logik, Supabase-Anbindung, State-Management, API-Calls etc. bleiben EXAKT gleich
2. **Tailwind CSS verwenden** wo möglich, Inline-Styles nur wo Tailwind nicht reicht (z.B. für spezifische Gradienten, backdrop-filter)
3. **Alle bestehenden Funktionalitäten müssen erhalten bleiben** — nichts löschen, nur das Aussehen ändern
4. **Die CLAUDE.md Konventionen beachten** — besonders die Bug-Prevention Patterns
5. **Schrittweise vorgehen**: Erst die globalen Styles (Fonts, Farben, Layout), dann Seite für Seite
6. **Keine Emojis oder Icons** in der UI (außer dem bestehenden Loading-Spinner) — die Referenz-Dateien nutzen teilweise Emojis als Platzhalter für Icons, diese NICHT übernehmen
7. **Alle Texte bleiben auf Deutsch**
8. Nach dem Umbau den `design-reference/` Ordner löschen — der gehört nicht ins Projekt
