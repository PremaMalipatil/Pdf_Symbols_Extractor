import { useState } from 'react'
import { Download, Trash2, ImageIcon, Code2, Eye } from 'lucide-react'
import { Symbol, ViewMode } from '../types'
import { apiService } from '../services/api'
import toast from 'react-hot-toast'

interface SymbolCardProps {
  symbol: Symbol
  onDelete: (id: number) => void
  onClick: (symbol: Symbol) => void
}

export function SymbolCard({ symbol, onDelete, onClick }: SymbolCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('png')
  const [imgError, setImgError] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await apiService.deleteSymbol(symbol.id)
      toast.success('Symbol deleted')
      onDelete(symbol.id)
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleDownload = (e: React.MouseEvent, type: 'png' | 'svg') => {
    e.stopPropagation()
    const url = type === 'png' ? apiService.downloadPng(symbol.id) : apiService.downloadSvg(symbol.id)
    window.open(url, '_blank')
  }

  const imgSrc = viewMode === 'png' ? symbol.png_url : symbol.svg_url
  const hasSvg = Boolean(symbol.svg_url)

  return (
    <div
      className="symbol-thumb group"
      onClick={() => onClick(symbol)}
    >
      {/* Image area — white bg to show symbols clearly */}
      <div className="relative bg-white aspect-square overflow-hidden flex items-center justify-center p-2">
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt={`Symbol ${symbol.symbol_number}`}
            className="max-w-full max-h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-gray-300">
            <ImageIcon className="w-7 h-7" />
            <span className="text-xs">No preview</span>
          </div>
        )}

        {/* Hover action overlay */}
        <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); onClick(symbol) }}
            className="w-8 h-8 bg-white/15 hover:bg-[#6366f1] rounded-lg flex items-center justify-center text-white transition-colors"
            title="Preview"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={e => handleDownload(e, 'png')}
            className="w-8 h-8 bg-white/15 hover:bg-[#6366f1] rounded-lg flex items-center justify-center text-white transition-colors"
            title="Download PNG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {hasSvg && (
            <button
              onClick={e => handleDownload(e, 'svg')}
              className="w-8 h-8 bg-white/15 hover:bg-[#6366f1] rounded-lg flex items-center justify-center text-white transition-colors"
              title="Download SVG"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Page badge */}
        <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
          P{symbol.page_number}
        </div>

        {/* Delete btn — top right */}
        <button
          onClick={handleDelete}
          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-500 rounded flex items-center justify-center text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[#d1d5db] font-medium text-xs">Symbol {symbol.symbol_number}</span>
          <span className="text-[#4b5563] text-[10px]">
            {symbol.bounding_box.w}×{symbol.bounding_box.h}
          </span>
        </div>

        {/* PNG / SVG toggle */}
        <div className="flex gap-1 mt-1.5">
          <button
            onClick={e => { e.stopPropagation(); setViewMode('png'); setImgError(false) }}
            className={`flex-1 text-[10px] py-0.5 rounded transition-colors font-medium
              ${viewMode === 'png'
                ? 'bg-[#6366f1] text-white'
                : 'bg-[#1e2029] text-[#6b7280] hover:text-white'}`}
          >
            PNG
          </button>
          <button
            onClick={e => { e.stopPropagation(); if (hasSvg) { setViewMode('svg'); setImgError(false) } }}
            disabled={!hasSvg}
            className={`flex-1 text-[10px] py-0.5 rounded transition-colors font-medium
              ${viewMode === 'svg' && hasSvg
                ? 'bg-[#6366f1] text-white'
                : 'bg-[#1e2029] text-[#6b7280] hover:text-white'}
              disabled:opacity-25 disabled:cursor-not-allowed`}
          >
            SVG
          </button>
        </div>
      </div>
    </div>
  )
}
