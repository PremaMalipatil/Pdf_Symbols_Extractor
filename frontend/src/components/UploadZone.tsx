import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { apiService } from '../services/api'
import { ProcessResponse } from '../types'
import toast from 'react-hot-toast'

interface UploadZoneProps {
  onProcessed: (result: ProcessResponse) => void
}

export function UploadZone({ onProcessed }: UploadZoneProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fileId, setFileId] = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0])
      setFileId(null)
      setProgress(0)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  })

  const handleUploadAndProcess = async () => {
    if (!file) return

    try {
      setUploading(true)
      setProgress(0)
      const uploadRes = await apiService.upload(file, setProgress)
      setFileId(uploadRes.file_id)
      toast.success('PDF uploaded!')

      setUploading(false)
      setProcessing(true)
      const processRes = await apiService.process(uploadRes.file_id)
      toast.success(`Found ${processRes.total_symbols} symbols!`)
      onProcessed(processRes)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Processing failed')
    } finally {
      setUploading(false)
      setProcessing(false)
    }
  }

  const isLoading = uploading || processing

  return (
    <div className="w-full space-y-4">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50 hover:bg-panel/50'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDragActive ? 'bg-accent' : 'bg-border'} transition-colors`}>
            <Upload className={`w-6 h-6 ${isDragActive ? 'text-white' : 'text-dim'}`} />
          </div>
          {isDragActive ? (
            <p className="text-accent font-medium">Drop your PDF here</p>
          ) : (
            <>
              <p className="text-white font-medium">Drag & drop a PDF, or click to browse</p>
              <p className="text-muted text-sm">Supports any PDF with symbols, diagrams, or icons</p>
            </>
          )}
        </div>
      </div>

      {file && (
        <div className="flex items-center gap-3 bg-panel border border-border rounded-xl px-4 py-3">
          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{file.name}</p>
            <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          {!isLoading && (
            <button onClick={() => { setFile(null); setFileId(null) }} className="text-muted hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted">
            <span>{uploading ? 'Uploading…' : 'Extracting symbols…'}</span>
            {uploading && <span>{progress}%</span>}
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
              style={{ width: uploading ? `${progress}%` : '100%' }}
            />
          </div>
          {processing && (
            <p className="text-xs text-muted text-center animate-pulse">
              Running computer vision pipeline…
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleUploadAndProcess}
        disabled={!file || isLoading}
        className="btn-primary w-full justify-center py-3"
      >
        {isLoading ? (
          <><Loader2 className="w-4 h-4 animate-spin" />{uploading ? 'Uploading…' : 'Extracting…'}</>
        ) : (
          <><Upload className="w-4 h-4" />Extract Symbols</>
        )}
      </button>
    </div>
  )
}
