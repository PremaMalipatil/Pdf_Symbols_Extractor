import { useState, useEffect } from 'react'
import { X, Download, Code2, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { Symbol } from '../types'
import { apiService } from '../services/api'

interface PreviewModalProps {
  symbol: Symbol
  symbols: Symbol[]
  onClose: () => void
  onNavigate: (sym: Symbol) => void
}

export function PreviewModal({ symbol, symbols, onClose, onNavigate }: PreviewModalProps) {
  const [tab, setTab] = useState<'png' | 'svg'>('png')
  const [imgError, setImgError] = useState(false)

  const currentIdx = symbols.findIndex(s => s.id === symbol.id)
  const prev = currentIdx > 0 ? symbols[currentIdx - 1] : null
  const next = currentIdx < symbols.length - 1 ? symbols[currentIdx + 1] : null
  const imgSrc = tab === 'png' ? symbol.png_url : symbol.svg_url

  // Reset error state when symbol or tab changes
  useEffect(() => { setImgError(false) }, [symbol.id, tab])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && prev) onNavigate(prev)
      if (e.key === 'ArrowRight' && next) onNavigate(next)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prev, next, onClose, onNavigate])

  const meta = [
    { label: 'Position', value: `${symbol.bounding_box.x}, ${symbol.bounding_box.y}` },
    { label: 'Dimensions', value: `${symbol.bounding_box.w} × ${symbol.bounding_box.h} px` },
    { label: 'Area', value: `${(symbol.area / 1000).toFixed(1)}k px²` },
    { label: 'Page', value: `${symbol.page_number}` },
    { label: 'Source', value: symbol.source_pdf || '—' },
    { label: 'Symbol #', value: `${symbol.symbol_number}` },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-2xl bg-[#13151c] border border-[#1e2029] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2029] shrink-0">
          <div>
            <h3 className="text-white font-semibold text-base">
              Symbol {symbol.symbol_number}
              <span className="text-[#4b5563] font-normal ml-2 text-sm">· Page {symbol.page_number}</span>
            </h3>
            <p className="text-[#6b7280] text-xs mt-0.5">{symbol.source_pdf}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#1e2029] flex items-center justify-center text-[#6b7280] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Image preview ── */}
        <div className="bg-white mx-5 mt-5 rounded-xl flex items-center justify-center overflow-hidden"
          style={{ minHeight: 260, maxHeight: 380 }}>
          {imgSrc && !imgError ? (
            <img
              src={imgSrc}
              alt={`Symbol ${symbol.symbol_number}`}
              className="max-w-full object-contain p-4"
              style={{ maxHeight: 370 }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-gray-300">
              <ImageIcon className="w-10 h-10" />
              <span className="text-sm">No preview available</span>
            </div>
          )}
        </div>

        {/* ── Controls row ── */}
        <div className="px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          {/* PNG / SVG tab */}
          <div className="flex gap-1 bg-[#0f1117] border border-[#1e2029] rounded-lg p-1">
            {(['png', 'svg'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                disabled={t === 'svg' && !symbol.svg_url}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors
                  ${tab === t ? 'bg-[#6366f1] text-white' : 'text-[#6b7280] hover:text-white'}
                  disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Download buttons */}
          <div className="flex gap-2">
            <a
              href={apiService.downloadPng(symbol.id)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e2029] hover:bg-[#2a2d3a] border border-[#2a2d3a] rounded-lg text-[#d1d5db] text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> PNG
            </a>
            {symbol.svg_url && (
              <a
                href={apiService.downloadSvg(symbol.id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e2029] hover:bg-[#2a2d3a] border border-[#2a2d3a] rounded-lg text-[#d1d5db] text-xs font-medium transition-colors"
              >
                <Code2 className="w-3.5 h-3.5" /> SVG
              </a>
            )}
          </div>

          {/* Prev / Next navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => prev && onNavigate(prev)}
              disabled={!prev}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#1e2029] hover:bg-[#2a2d3a] text-[#6b7280] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[#4b5563] text-xs w-14 text-center">
              {currentIdx + 1} / {symbols.length}
            </span>
            <button
              onClick={() => next && onNavigate(next)}
              disabled={!next}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#1e2029] hover:bg-[#2a2d3a] text-[#6b7280] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Metadata grid ── */}
        <div className="px-5 pb-5 grid grid-cols-3 gap-2">
          {meta.map(({ label, value }) => (
            <div key={label} className="bg-[#0f1117] border border-[#1e2029] rounded-lg px-3 py-2">
              <p className="text-[#4b5563] text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-[#d1d5db] text-xs font-mono truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-[#2a2d3a] text-[10px] pb-3">
          ← → to navigate · Esc to close
        </p>
      </div>
    </div>
  )
}
