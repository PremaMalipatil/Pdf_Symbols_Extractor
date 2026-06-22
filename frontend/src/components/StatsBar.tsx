// StatsBar is now embedded directly in DashboardPage.
// Kept as a re-usable compact summary strip for future use.
import { Layers, FileImage, Code2, Upload } from 'lucide-react'
import { Symbol } from '../types'

interface StatsBarProps {
  symbols: Symbol[]
}

export function StatsBar({ symbols }: StatsBarProps) {
  const pages   = new Set(symbols.map(s => s.page_number)).size
  const withSvg = symbols.filter(s => s.svg_path).length
  const sources = new Set(symbols.map(s => s.source_pdf).filter(Boolean)).size

  const items = [
    { label: 'Symbols',  value: symbols.length, icon: Layers,    color: 'text-[#818cf8]' },
    { label: 'Pages',    value: pages,           icon: FileImage,  color: 'text-emerald-400' },
    { label: 'With SVG', value: withSvg,         icon: Code2,      color: 'text-sky-400' },
    { label: 'PDFs',     value: sources,         icon: Upload,     color: 'text-amber-400' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-[#13151c] border border-[#1e2029] rounded-xl px-4 py-3 flex items-center gap-3">
          <Icon className={`w-4 h-4 shrink-0 ${color}`} />
          <div>
            <p className="text-white font-semibold text-lg leading-none">{value}</p>
            <p className="text-[#6b7280] text-xs mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
