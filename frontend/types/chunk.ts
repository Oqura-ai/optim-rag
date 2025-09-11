export interface Chunk {
  chunk_id: string
  chunk_hash: string
  filename: string
  filetype: string
  page: number
  data: string
  status: "unchanged" | "modified" | "new" | "deleted"
  lastEdited?: string
  originalHash?: string
}

export type ChunkStatus = "unchanged" | "modified" | "new" | "deleted"
