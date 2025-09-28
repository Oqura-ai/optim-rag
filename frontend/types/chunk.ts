export interface Chunk {
  chunk_id: string
  chunk_hash: string
  previous_hash: string | null
  filename: string
  filetype: string
  page_number: number
  page_content: string
  status: "unchanged" | "modified" | "new" | "deleted"
  lastEdited?: string
  originalHash?: string
}

export type ChunkStatus = "unchanged" | "modified" | "new" | "deleted"

export interface UploadedFile {
  id: string
  filename: string
  extension: string
  originalName: string
  size: number
  uploadedAt: string
  status: "new" | "committed"
  path: string // relative path in data-source folder
  file: File // Store the actual File object for uploading
}