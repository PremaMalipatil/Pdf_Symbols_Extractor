import { Layers, FileImage, Code2, Upload, Images, RefreshCw } from 'lucide-react'
import { Symbol } from '../types'

type Page = 'dashboard' | 'upload' | 'gallery'

interface DashboardPageProps {
  symbols: Symbol[]
  onNavigate: (p: Page) => void
  onRefresh: () => void
}

export function DashboardPage({ symbols, onNavigate, onRefresh }: DashboardPageProps) {
  const pages = new Set(symbols.map(s => s.page_number)).size
  const withSvg = symbols.filter(s => s.svg_path).length
  const sources = new Set(symbols.map(s => s.source_pdf).filter(Boolean))

  const stats = [
    { label: 'Total Symbols', value: symbols.length, icon: Layers, color: 'text-[#818cf8]', bg: 'bg-[#312e81]/30' },
    { label: 'Pages Processed', value: pages, icon: FileImage, color: 'text-emerald-400', bg: 'bg-emerald-900/20' },
    { label: 'SVG Exports', value: withSvg, icon: Code2, color: 'text-sky-400', bg: 'bg-sky-900/20' },
    { label: 'PDFs Processed', value: sources.size, icon: Upload, color: 'text-amber-400', bg: 'bg-amber-900/20' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-[#6b7280] text-sm">Overview of your symbol extraction activity</p>
        </div>
        <button onClick={onRefresh} className="btn-secondary py-2 px-4 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card px-5 py-5">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-[#6b7280] text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => onNavigate('upload')}
          className="card p-5 text-left hover:border-[#6366f1]/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#312e81]/40 flex items-center justify-center mb-3 group-hover:bg-[#312e81]/70 transition-colors">
            <Upload className="w-5 h-5 text-[#818cf8]" />
          </div>
          <p className="text-white font-medium mb-1">Upload a PDF</p>
          <p className="text-[#6b7280] text-sm">Extract symbols from a new PDF file</p>
        </button>
        <button
          onClick={() => onNavigate('gallery')}
          className="card p-5 text-left hover:border-[#6366f1]/50 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-900/30 flex items-center justify-center mb-3 group-hover:bg-emerald-900/50 transition-colors">
            <Images className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-white font-medium mb-1">Browse Gallery</p>
          <p className="text-[#6b7280] text-sm">View and download extracted symbols</p>
        </button>
      </div>

      {/* Recent PDFs */}
      {sources.size > 0 && (
        <div className="card p-5">
          <h2 className="text-white font-semibold mb-4">Recent PDFs</h2>
          <div className="space-y-2">
            {[...sources].map(src => {
              const count = symbols.filter(s => s.source_pdf === src).length
              return (
                <div key={src} className="flex items-center justify-between py-2.5 border-b border-[#1e2029] last:border-0">
                  <span className="text-[#d1d5db] text-sm truncate">{src}</span>
                  <span className="text-[#6366f1] text-sm font-medium ml-4 shrink-0">{count} symbols</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {symbols.length === 0 && (
        <div className="card p-12 text-center">
          <Layers className="w-12 h-12 text-[#2a2d3a] mx-auto mb-3" />
          <p className="text-[#4b5563] text-sm">No symbols yet. Upload a PDF to get started.</p>
          <button onClick={() => onNavigate('upload')} className="btn-primary mt-4 mx-auto w-fit">
            <Upload className="w-4 h-4" /> Upload PDF
          </button>
        </div>
      )}
    </div>
  )
}
