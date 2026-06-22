import { useState, useEffect } from 'react'
import { Search, Grid, List, RefreshCw, X, Images } from 'lucide-react'
import { Symbol } from '../types'
import { SymbolCard } from '../components/SymbolCard'

interface GalleryPageProps {
  symbols: Symbol[]
  onDelete: (id: number) => void
  onPreview: (sym: Symbol) => void
  onRefresh: () => void
}

export function GalleryPage({ symbols, onDelete, onPreview, onRefresh }: GalleryPageProps) {
  const [search, setSearch] = useState('')
  const [selectedPage, setSelectedPage] = useState<number | 'all'>('all')
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [filtered, setFiltered] = useState<Symbol[]>(symbols)

  useEffect(() => {
    let result = symbols
    if (selectedPage !== 'all') result = result.filter(s => s.page_number === selectedPage)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(s =>
        `symbol ${s.symbol_number}`.includes(q) ||
        `page ${s.page_number}`.includes(q) ||
        (s.source_pdf || '').toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [symbols, search, selectedPage])

  const pages = [...new Set(symbols.map(s => s.page_number))].sort((a, b) => a - b)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Gallery</h1>
          <p className="text-[#6b7280] text-sm">{symbols.length} symbols extracted</p>
        </div>
        <button onClick={onRefresh} className="btn-secondary py-2 px-4 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Toolbar */}
      {symbols.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]" />
            <input
              type="text"
              placeholder="Search symbols…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#13151c] border border-[#1e2029] rounded-lg pl-9 pr-9 py-2 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-[#6366f1] transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b5563] hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Page filter */}
          <div className="flex gap-1 bg-[#13151c] border border-[#1e2029] rounded-lg p-1">
            <button
              onClick={() => setSelectedPage('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${selectedPage === 'all' ? 'bg-[#6366f1] text-white' : 'text-[#6b7280] hover:text-white'}`}
            >All</button>
            {pages.map(p => (
              <button
                key={p}
                onClick={() => setSelectedPage(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${selectedPage === p ? 'bg-[#6366f1] text-white' : 'text-[#6b7280] hover:text-white'}`}
              >P{p}</button>
            ))}
          </div>

          {/* Layout toggle */}
          <div className="flex gap-1 bg-[#13151c] border border-[#1e2029] rounded-lg p-1">
            <button onClick={() => setLayout('grid')} className={`p-1.5 rounded-md transition-colors ${layout === 'grid' ? 'bg-[#6366f1] text-white' : 'text-[#6b7280] hover:text-white'}`}>
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setLayout('list')} className={`p-1.5 rounded-md transition-colors ${layout === 'list' ? 'bg-[#6366f1] text-white' : 'text-[#6b7280] hover:text-white'}`}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-[#4b5563] text-xs">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className={layout === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
          : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
        }>
          {filtered.map(sym => (
            <SymbolCard key={sym.id} symbol={sym} onDelete={onDelete} onClick={onPreview} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Images className="w-12 h-12 text-[#2a2d3a] mb-3" />
          <p className="text-[#4b5563] text-sm">
            {symbols.length === 0
              ? 'No symbols yet. Upload a PDF to extract symbols.'
              : 'No symbols match your search.'}
          </p>
        </div>
      )}
    </div>
  )
}
