import { useState } from 'react'
import NutriScoreBadge from './NutriScoreBadge'
import { calcItemNutrients, calcTotals } from '../../utils/ernaehrung'

export default function MahlzeitSection({ mahlzeit, items, onAdd, onRemove }) {
  const [expanded, setExpanded] = useState(true)
  const totals = calcTotals(items)

  return (
    <div className="bg-white rounded-[14px] overflow-hidden border border-[#E8E6E1]">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-[#1A1A1A] text-sm">{mahlzeit.label}</span>
          {totals.kcal > 0 && (
            <span className="ml-2 text-xs text-[#A8A8A8]">{Math.round(totals.kcal)} kcal</span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onAdd() }}
          className="w-7 h-7 bg-[#E8F0EC] text-[#2D6A4F] rounded-full flex items-center justify-center hover:bg-[#d0e5d8] transition-colors font-bold text-base leading-none"
          aria-label="Produkt hinzufügen"
        >
          +
        </button>
        <span className="text-[#A8A8A8] text-sm ml-1">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="border-t border-[#E8E6E1]">
          {items.length === 0 ? (
            <button
              onClick={onAdd}
              className="w-full text-xs text-[#A8A8A8] hover:text-[#2D6A4F] px-4 py-3 text-left transition-colors"
            >
              + Lebensmittel eintragen
            </button>
          ) : (
            <>
              {items.map(item => {
                const n = calcItemNutrients(item)
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#E8E6E1] last:border-0 group">
                    <NutriScoreBadge grade={item.nutriScore} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1A1A1A] truncate">{item.productName}</p>
                      <p className="text-xs text-[#A8A8A8]">{item.amount}g</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[#1A1A1A]">{n.kcal} kcal</p>
                      <p className="text-xs text-[#A8A8A8]">
                        P {n.protein}g · K {n.kohlenhydrate}g · F {n.fett}g
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="text-[#A8A8A8] hover:text-[#991B1B] transition-colors text-xl leading-none ml-1 opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
              <div className="px-4 py-2 bg-[#F2F1EE] flex justify-between text-xs text-[#6B6B6B]">
                <span className="font-medium text-[#1A1A1A]">{Math.round(totals.kcal)} kcal</span>
                <span>P {totals.protein.toFixed(1)}g · K {totals.kohlenhydrate.toFixed(1)}g · F {totals.fett.toFixed(1)}g</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
