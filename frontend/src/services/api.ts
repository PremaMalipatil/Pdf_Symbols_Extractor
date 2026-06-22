import axios from 'axios'
import { UploadResponse, ProcessResponse, Symbol } from '../types'

const api = axios.create({ baseURL: '/api' })

export const apiService = {
  async upload(file: File, onProgress?: (pct: number) => void): Promise<UploadResponse> {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post<UploadResponse>('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    })
    return res.data
  },

  async process(fileId: string): Promise<ProcessResponse> {
    const res = await api.post<ProcessResponse>(`/process/${fileId}`)
    return res.data
  },

  async listSymbols(page?: number, sourcePdf?: string): Promise<Symbol[]> {
    const params: Record<string, unknown> = {}
    if (page !== undefined) params.page = page
    if (sourcePdf) params.source_pdf = sourcePdf
    const res = await api.get<Symbol[]>('/symbols', { params })
    return res.data
  },

  async getSymbol(id: number): Promise<Symbol> {
    const res = await api.get<Symbol>(`/symbols/${id}`)
    return res.data
  },

  async deleteSymbol(id: number): Promise<void> {
    await api.delete(`/symbols/${id}`)
  },

  downloadPng(id: number): string {
    return `/api/download/png/${id}`
  },

  downloadSvg(id: number): string {
    return `/api/download/svg/${id}`
  },
}
