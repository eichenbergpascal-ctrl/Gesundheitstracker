// Reihenfolge für die Sortierung
const PRIORITY_RANK = { hoch: 0, mittel: 1, niedrig: 2 }

function isAlreadyTracked(suggName, existingSupps) {
  const key = suggName.toLowerCase()
  return existingSupps.some(s => s.toLowerCase().includes(key))
}

/**
 * Analysiert Nutzerdaten und gibt personalisierte Supplement-Empfehlungen zurück.
 * Jeder Vorschlag enthält zusätzlich defaultZeitpunkt und defaultHaeufigkeit
 * für das automatische Vorausfüllen des Formulars.
 *
 * @returns {{ name, priority, reason, dosis, hinweis,
 *             defaultZeitpunkt, defaultHaeufigkeit }[]}
 */
export function analyzeSupplements({
  avgUV7,
  month,
  ernaehrungsweise,
  aktivitaet,
  geschlecht,
  avgProteinPct,
  avgKcalPct,
  avgFatPct,
  existingSupps,
}) {
  const suggestions = []
  const isVeganVeg = ['vegan', 'vegetarisch'].includes(ernaehrungsweise)

  // ── Vitamin D3 ─────────────────────────────────────────────────────────────
  const d3UV = avgUV7 < 3
  const d3Winter = [11, 12, 1, 2].includes(month)
  if (d3UV || d3Winter) {
    suggestions.push({
      name: 'Vitamin D3',
      priority: 'hoch',
      reason: d3UV
        ? `Dein UV-Index lag in den letzten 7 Tagen bei Ø ${avgUV7.toFixed(1)} – zu niedrig für körpereigene D3-Synthese.`
        : 'In den Wintermonaten reicht das Sonnenlicht in Mitteleuropa nicht für ausreichende D3-Bildung.',
      dosis: '1.000–2.000 IE täglich',
      hinweis: 'Morgens zum Frühstück mit etwas Fett einnehmen.',
      defaultZeitpunkt: 'morgens',
      defaultHaeufigkeit: 'taeglich',
    })
  }

  // ── Vitamin B12 ────────────────────────────────────────────────────────────
  if (isVeganVeg) {
    suggestions.push({
      name: 'Vitamin B12',
      priority: 'hoch',
      reason: 'Bei veganer/vegetarischer Ernährung ist B12 aus tierischen Quellen kaum verfügbar – ein Mangel entwickelt sich schleichend.',
      dosis: '500–1.000 µg täglich',
      hinweis: 'Methylcobalamin ist besser bioverfügbar als Cyanocobalamin.',
      defaultZeitpunkt: 'morgens',
      defaultHaeufigkeit: 'taeglich',
    })
  }

  // ── Omega-3 (DHA/EPA) ──────────────────────────────────────────────────────
  const isFatLow = avgFatPct < 60
  if (isVeganVeg || isFatLow) {
    suggestions.push({
      name: 'Omega-3 (DHA/EPA)',
      priority: isVeganVeg ? 'hoch' : 'mittel',
      reason: isVeganVeg
        ? 'Pflanzliche Omega-3-Quellen (ALA) werden kaum in die aktiven Formen DHA/EPA umgewandelt.'
        : 'Deine Fettzufuhr liegt unter 60% des Ziels – marine Omega-3-Fettsäuren könnten fehlen.',
      dosis: '250–500 mg DHA/EPA täglich',
      hinweis: 'Für Veganer: Algenpräparate sind die beste Quelle für DHA/EPA.',
      defaultZeitpunkt: 'mittags',
      defaultHaeufigkeit: 'taeglich',
    })
  }

  // ── Protein ────────────────────────────────────────────────────────────────
  if (avgProteinPct < 70) {
    suggestions.push({
      name: 'Protein',
      priority: avgProteinPct < 50 ? 'hoch' : 'mittel',
      reason: `Du erreichst im Schnitt nur ${Math.round(avgProteinPct)}% deines Proteinziels.`,
      dosis: '20–30 g pro Portion nach Bedarf',
      hinweis: isVeganVeg
        ? 'Erbsen- oder Reisprotein als pflanzliche Alternative.'
        : 'Whey-Isolat oder -Konzentrat, idealerweise nach dem Training.',
      defaultZeitpunkt: 'morgens',
      defaultHaeufigkeit: 'taeglich',
    })
  }

  // ── Magnesium ──────────────────────────────────────────────────────────────
  if (['aktiv', 'sehr_aktiv'].includes(aktivitaet)) {
    suggestions.push({
      name: 'Magnesium',
      priority: 'mittel',
      reason: 'Bei hoher körperlicher Aktivität wird Magnesium vermehrt über den Schweiß ausgeschieden.',
      dosis: '300–400 mg täglich',
      hinweis: 'Abends einnehmen – unterstützt Muskelregeneration und Schlaf.',
      defaultZeitpunkt: 'abends',
      defaultHaeufigkeit: 'taeglich',
    })
  }

  // ── Zink ───────────────────────────────────────────────────────────────────
  if (isVeganVeg) {
    suggestions.push({
      name: 'Zink',
      priority: 'mittel',
      reason: 'Pflanzliches Zink ist durch Phytate schlechter bioverfügbar als Zink aus tierischen Quellen.',
      dosis: '7–10 mg täglich',
      hinweis: 'Nicht gleichzeitig mit Eisen einnehmen.',
      defaultZeitpunkt: 'morgens',
      defaultHaeufigkeit: 'jeden_2_tag',
    })
  }

  // ── Eisen ──────────────────────────────────────────────────────────────────
  if (geschlecht === 'weiblich') {
    suggestions.push({
      name: 'Eisen',
      priority: 'mittel',
      reason: 'Frauen haben durch den monatlichen Zyklus einen erhöhten Eisenbedarf.',
      dosis: '10–15 mg täglich',
      hinweis: 'Mit Vitamin C einnehmen für bessere Aufnahme. Blutbild beim Arzt prüfen lassen bevor hochdosiert supplementiert wird.',
      defaultZeitpunkt: 'morgens',
      defaultHaeufigkeit: 'taeglich',
    })
  }

  // ── Multivitamin ───────────────────────────────────────────────────────────
  if (avgKcalPct < 60) {
    suggestions.push({
      name: 'Multivitamin',
      priority: 'mittel',
      reason: `Deine Kalorienzufuhr liegt im Schnitt bei ${Math.round(avgKcalPct)}% des Ziels – bei geringer Nahrungsmenge können Mikronährstoffe fehlen.`,
      dosis: '1 Kapsel täglich zum Frühstück',
      hinweis: 'Kein Ersatz für eine ausgewogene Ernährung, aber eine gute Absicherung.',
      defaultZeitpunkt: 'morgens',
      defaultHaeufigkeit: 'taeglich',
    })
  }

  // ── Filter bereits getrackter Supplements + Sortierung ────────────────────
  return suggestions
    .filter(s => !isAlreadyTracked(s.name, existingSupps))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
}
