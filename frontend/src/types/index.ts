export interface BoundingBox {
  x: number
  y: number
  w: number
  h: number
}

export interface Symbol {
  id: number
  page_number: number
  symbol_number: number
  bounding_box: BoundingBox
  area: number
  source_pdf: string | null
  png_path: string
  svg_path: string | null
  created_at: string
  png_url: string | null
  svg_url: string | null
}

export interface UploadResponse {
  file_id: string
  filename: string
  message: string
}

export interface ProcessResponse {
  total_symbols: number
  pages_processed: number
  symbols: Symbol[]
  message: string
}

export type ViewMode = 'png' | 'svg'
export type PreviewMode = 'grid' | 'list'
