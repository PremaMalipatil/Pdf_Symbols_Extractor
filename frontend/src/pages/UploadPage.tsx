import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Loader2, CheckCircle, ArrowRight, RotateCcw } from 'lucide-react'
import { apiService } from '../services/api'
import { ProcessResponse } from '../types'
import toast from 'react-hot-toast'

interface UploadPageProps {
  onProcessed: (res: ProcessResponse) => void
  lastResult: ProcessResponse | null
  onViewGallery: () => void
}

export function UploadPage({ onProcessed, lastResult, onViewGallery }: UploadPageProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [result, setResult] = useState<ProcessResponse | null>(lastResult)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setDone(false)
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading || processing,
  })

  const handleExtract = async () => {
    if (!file) return
    try {
      setUploading(true)
      setProgress(0)
      const uploadRes = await apiService.upload(file, setProgress)
      setUploading(false)
      setProcessing(true)
      const processRes = await apiService.process(uploadRes.file_id)
      setResult(processRes)
      onProcessed(processRes)
      setDone(true)
      toast.success(`Extracted ${processRes.total_symbols} symbols!`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Processing failed')
    } finally {
      setUploading(false)
      setProcessing(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setDone(false)
    setResult(null)
    setProgress(0)
  }

  const isLoading = uploading || processing

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Upload PDF</h1>
        <p className="text-[#6b7280] text-sm">
          Drop a PDF containing symbols or diagrams and the system will extract and vectorize them automatically.
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 mb-4
          ${isDragActive
            ? 'border-[#6366f1] bg-[#6366f1]/10'
            : 'border-[#2a2d3a] bg-[#13151c] hover:border-[#6366f1]/50 hover:bg-[#13151c]'
          }
          ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input {...getInputProps()} />

        {/* Upload icon */}
        <div className={`mb-4 transition-colors ${isDragActive ? 'text-[#6366f1]' : 'text-[#4b5563]'}`}>
          <Upload className="w-10 h-10 mx-auto" strokeWidth={1.5} />
        </div>

        {isDragActive ? (
          <p className="text-[#818cf8] font-medium">Drop your PDF here</p>
        ) : (
          <>
            <p className="text-[#6b7280] font-medium mb-1">Drag & drop a PDF</p>
            <p className="text-[#4b5563] text-sm">or click to browse</p>
          </>
        )}

        {/* Attached file pill */}
        {file && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#1e2029] border border-[#2a2d3a] rounded-lg px-4 py-2 text-sm">
            <FileText className="w-4 h-4 text-[#6366f1] shrink-0" />
            <span className="text-white truncate max-w-[200px]">{file.name}</span>
            <span className="text-[#6b7280]">({(file.size / 1024).toFixed(0)} KB)</span>
            {!isLoading && (
              <button
                onClick={e => { e.stopPropagation(); handleReset() }}
                className="ml-1 text-[#6b7280] hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isLoading && (
        <div className="mb-4 space-y-1.5">
          <div className="flex justify-between text-xs text-[#6b7280]">
            <span>{uploading ? 'Uploading…' : 'Running extraction pipeline…'}</span>
            {uploading && <span>{progress}%</span>}
          </div>
          <div className="h-1.5 bg-[#1e2029] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#6366f1] rounded-full transition-all duration-300"
              style={{ width: uploading ? `${progress}%` : '100%', animation: processing ? 'pulse 1.5s ease-in-out infinite' : 'none' }}
            />
          </div>
        </div>
      )}

      {/* Extract button */}
      {!done && (
        <button
          onClick={handleExtract}
          disabled={!file || isLoading}
          className="btn-primary w-full py-3"
        >
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" />{uploading ? 'Uploading…' : 'Extracting symbols…'}</>
            : <><Upload className="w-4 h-4" />Extract Symbols</>
          }
        </button>
      )}

      {/* Success result */}
      {done && result && (
        <div className="mt-4 bg-[#13151c] border border-[#1e2029] rounded-xl p-6">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">Extraction complete!</h3>
              <p className="text-[#6b7280] text-sm">
                Found <span className="text-white font-medium">{result.total_symbols}</span> symbols
                across <span className="text-white font-medium">{result.pages_processed}</span> page{result.pages_processed !== 1 ? 's' : ''}.
              </p>
              <div className="flex gap-3 mt-4">
                <button onClick={onViewGallery} className="btn-primary">
                  View Gallery <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={handleReset} className="btn-secondary">
                  <RotateCcw className="w-4 h-4" /> Upload another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
