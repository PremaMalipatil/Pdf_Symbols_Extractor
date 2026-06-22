import { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, Upload, Images, ScanLine, Circle } from 'lucide-react'
import { UploadPage } from './pages/UploadPage'
import { GalleryPage } from './pages/GalleryPage'
import { DashboardPage } from './pages/DashboardPage'
import { PreviewModal } from './components/PreviewModal'
import { apiService } from './services/api'
import { Symbol, ProcessResponse } from './types'
import toast from 'react-hot-toast'

type Page = 'dashboard' | 'upload' | 'gallery'

export default function App() {
  const [page, setPage] = useState<Page>('upload')
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [preview, setPreview] = useState<Symbol | null>(null)
  const [apiOnline, setApiOnline] = useState(false)
  const [lastResult, setLastResult] = useState<ProcessResponse | null>(null)

  const fetchSymbols = useCallback(async () => {
    try {
      const data = await apiService.listSymbols()
      setSymbols(data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    const checkApi = async () => {
      try {
        await fetch('/health')
        setApiOnline(true)
      } catch {
        setApiOnline(false)
      }
    }
    checkApi()
    fetchSymbols()
  }, [fetchSymbols])

  const handleProcessed = (res: ProcessResponse) => {
    setLastResult(res)
    setSymbols(res.symbols)
  }

  const handleDelete = (id: number) => {
    setSymbols(prev => prev.filter(s => s.id !== id))
  }

  const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload',    label: 'Upload PDF', icon: Upload },
    { id: 'gallery',   label: 'Gallery',    icon: Images },
  ]

  return (
    <div className="flex h-screen bg-[#0f1117] overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-[#1e2029] bg-[#0f1117]">
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b border-[#1e2029]">
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-7 h-7 rounded-lg bg-[#6366f1] flex items-center justify-center shrink-0">
              <ScanLine className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-sm leading-tight">PDF Symbol<br/>Extractor</span>
          </div>
          <p className="text-[#4b5563] text-xs mt-2 ml-9">v1.0.0</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`sidebar-link w-full ${page === id ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* API status */}
        <div className="px-5 py-4 border-t border-[#1e2029]">
          <div className="flex items-center gap-2">
            <Circle
              className={`w-2 h-2 fill-current ${apiOnline ? 'text-emerald-400' : 'text-red-400'}`}
            />
            <span className="text-xs text-[#6b7280]">
              API {apiOnline ? 'online' : 'offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        {page === 'dashboard' && (
          <DashboardPage
            symbols={symbols}
            onNavigate={setPage}
            onRefresh={fetchSymbols}
          />
        )}
        {page === 'upload' && (
          <UploadPage
            onProcessed={(res) => { handleProcessed(res); }}
            lastResult={lastResult}
            onViewGallery={() => setPage('gallery')}
          />
        )}
        {page === 'gallery' && (
          <GalleryPage
            symbols={symbols}
            onDelete={handleDelete}
            onPreview={setPreview}
            onRefresh={fetchSymbols}
          />
        )}
      </main>

      {preview && (
        <PreviewModal
          symbol={preview}
          symbols={symbols}
          onClose={() => setPreview(null)}
          onNavigate={setPreview}
        />
      )}
    </div>
  )
}
