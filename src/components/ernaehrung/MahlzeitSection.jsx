import { useState } from 'react'
import NutriScoreBadge from './NutriScoreBadge'
import { calcItemNutrients, calcTotals } from '../../utils/ernaehrung'

const glass = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  overflow: 'hidden',
}

export default function MahlzeitSection({ mahlzeit, items, onAdd, onRemove }) {
  const [expanded, setExpanded] = useState(true)
  const totals = calcTotals(items)

  return (
    <div style={glass}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', cursor: 'pointer',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, color: '#F1F5F9', fontSize: 13 }}>{mahlzeit.label}</span>
          {totals.kcal > 0 && (
            <span style={{ marginLeft: 8, fontSize: 11, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace" }}>
              {Math.round(totals.kcal)} kcal
            </span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onAdd() }}
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(16,185,129,0.15)',
            color: '#10B981', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, lineHeight: 1, fontWeight: 700,
            transition: 'background 0.2s',
          }}
          aria-label="Produkt hinzufügen"
        >
          +
        </button>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {items.length === 0 ? (
            <button
              onClick={onAdd}
              style={{
                width: '100%', textAlign: 'left', padding: '12px 16px',
                fontSize: 12, color: '#475569', background: 'none', border: 'none',
                cursor: 'pointer', transition: 'color 0.2s',
              }}
            >
              + Lebensmittel eintragen
            </button>
          ) : (
            <>
              {items.map(item => {
                const n = calcItemNutrients(item)
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                    className="group"
                  >
                    <NutriScoreBadge grade={item.nutriScore} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#F1F5F9', margin: 0 }} className="truncate">{item.productName}</p>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{item.amount}g</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{
                        fontSize: 13, fontWeight: 600, color: '#F1F5F9', margin: 0,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {n.kcal} kcal
                      </p>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
                        P {n.protein}g · K {n.kohlenhydrate}g · F {n.fett}g
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      style={{
                        color: '#475569', background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: 20, lineHeight: 1, marginLeft: 4,
                        transition: 'color 0.2s',
                      }}
                      onMouseEnter={e => e.target.style.color = '#EF4444'}
                      onMouseLeave={e => e.target.style.color = '#475569'}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
              <div style={{
                padding: '8px 16px',
                display: 'flex', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.03)',
              }}>
                <span style={{
                  fontWeight: 600, color: '#F1F5F9', fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {Math.round(totals.kcal)} kcal
                </span>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
                  P {totals.protein.toFixed(1)}g · K {totals.kohlenhydrate.toFixed(1)}g · F {totals.fett.toFixed(1)}g
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
