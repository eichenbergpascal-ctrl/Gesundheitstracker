# Vitalio — Redesign Briefing für Claude Design

## Projekt

Du bekommst den kompletten Codebase-Ordner einer Gesundheitstracker-App namens **Vitalio**. Die App ist gebaut mit React 19, Vite, Tailwind CSS v4 und Supabase. Alle Texte sind auf Deutsch.

## Ziel

Erstelle ein **vollständiges Markendesign** für Vitalio. Kein schlichtes Minimal-Design — es soll wie ein echtes, professionelles Produkt aussehen, das man im App Store erwarten würde. Denk an Apps wie **Oura Ring**, **Whoop**, **Arc Browser** oder **Linear** — clean aber mit Charakter.

## Was ich will

### Brand Identity
- Ein eigenständiges **Farbsystem** mit Primary, Secondary, Accent-Farben — nicht einfach nur Grün auf Weiß
- Eine Farbpalette die sich modern und "premium" anfühlt (z.B. dunkle Akzente, Glassmorphism, subtile Gradienten)
- **Typografie-Hierarchie** die Persönlichkeit hat (nicht nur Inter in verschiedenen Größen)
- Ein visuelles System für Icons, Badges und Status-Indikatoren

### Hover-Effekte & Micro-Interactions
- **Karten**: Lift-Effekt (subtle shadow + scale) beim Hovern
- **Buttons**: Smooth State-Transitions mit Farbwechsel und ggf. leichtem Scale
- **Navigation**: Animierte aktive Tab-Indikatoren (sliding underline oder morphing background)
- **Progress-Ringe**: Smooth Einblend-Animation beim Laden
- **Listen-Items**: Slide-in oder Fade-in beim Erscheinen
- **Modals**: Backdrop-blur + Slide-up Animation
- **Toggles/Checkboxen**: Satisfying Click-Feedback mit Spring-Animation

### Seiten die redesigned werden sollen

**1. Dashboard** (wichtigste Seite)
- Gesundheits-Score als Hero-Element (groß, visuell beeindruckend, nicht nur ein Ring)
- Quick-Stats für Kalorien und Supplements als schöne Karten mit Hover-Effekten
- Nächste Arzttermine elegant integriert
- Evtl. ein Greeting ("Guten Morgen, Pascal") mit Tageskontext

**2. Ernährung (Nutrition Check)**
- Kalorien-Ring und Makro-Bars visuell aufwerten
- Mahlzeiten-Sektionen (Frühstück, Mittag, Abend, Snacks) als stylische Karten
- Such-Modal für Lebensmittel modern gestalten

**3. Allergie-Radar**
- Wetter-Karte als Hero-Card mit visuellen Wetter-Elementen
- Pollen-Chart und Luftqualität visuell ansprechend
- Farbcodierte Pollen-Level mit besserem visuellen System

**4. Supplements**
- Supplement-Karten mit Check-Animation
- Streak-Anzeige als motivierendes Element
- Guide-Tab mit schönen Empfehlungskarten (Priority-Badges aufwerten)

**5. Trends & Forecast**
- Charts visuell aufwerten (Gradient-Fills, bessere Tooltips)
- Forecast als Timeline oder visuelle Vorhersage

**6. Arzttermine**
- Timeline-Darstellung statt einfacher Liste
- Termin-Karten mit Status-Indikatoren

**7. Profil**
- Aufgeräumtes Settings-Layout
- BMI und Kalorienbedarf als visuelle Highlights
- Allergie-/Unverträglichkeits-Auswahl als schönes Grid

**8. Login**
- Full-Screen Design mit Brand-Elementen
- Nicht nur ein weißes Kästchen in der Mitte

### Navigation
- **Desktop**: Top-Navigation mit animiertem aktiven Tab
- **Mobile**: Bottom-Navigation mit smooth Transitions und aktivem Indikator
- Logo "Vitalio" als Brand-Element mit eigenem Styling

## Aktueller Tech-Stack (nicht ändern)
- React 19 + Vite (JSX, kein TypeScript)
- Tailwind CSS v4
- Recharts für Charts
- Supabase für Backend

## Aktuelles Farbschema (als Referenz, darf komplett geändert werden)
- Primary: #2D6A4F (Grün)
- Text: #1A1A1A
- Background: #F8F7F4
- Border: #E8E6E1
- Cards: #FFFFFF

## Design-Richtung
- **Premium Health App** — nicht klinisch, nicht kindlich
- **Dark Mode-Elemente** sind erlaubt (z.B. dunkle Header, dunkle Cards)
- **Glassmorphism / Frosted Glass** Effekte wo es passt
- **Subtile Gradienten** statt flacher Farben
- **Depth durch Shadows** — mehrere Shadow-Layer für Tiefe
- Denk an ein Design das man auf Dribbble oder Behance sehen würde

## Output
Erstelle Mockups/Designs für jede der genannten Seiten. Zeig mir wie die Brand aussehen soll — Farben, Typografie, Komponenten, Hover-States, Animationen. Das Design soll direkt als Vorlage dienen um es danach im Code umzusetzen.
