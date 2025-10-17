import type { Chunk } from "@/types/chunk"
import crypto from "crypto";

// Simple hash function for demonstration (in production, use crypto.subtle.digest)
function generateChunkHash(
  filename: string,
  filetype: string,
  chunkId: string,
  content: string
): string {
  const hashInput = `${filename}-${filetype}-${chunkId}-${content}`;
  return crypto.createHash("sha256").update(hashInput, "utf8").digest("hex");
}

export function updateChunkStatus(chunk: Chunk, newContent: string): Chunk {
  const newHash = generateChunkHash(chunk.filename, chunk.filetype, chunk.chunk_id, newContent)
  const isChanged = newHash !== chunk.chunk_hash
  let final_status: "new" | "unchanged" | "modified" | "deleted";

  if (isChanged && chunk.status != 'new') {
    final_status = 'modified';
  }
  else if (chunk.status != 'new') {
    final_status = 'unchanged';
  }
  else {
    final_status = 'new';
  }

  return {
    ...chunk,
    page_content: newContent,
    chunk_hash: newHash,
    previous_hash: chunk.chunk_hash,
    status: final_status,
    lastEdited: new Date().toISOString(),
  }
}

export function deleteChunk(chunk: Chunk): Chunk {
  return {
    ...chunk,
    status: "deleted",
    lastEdited: new Date().toISOString(),
  }
}

export function createNewChunk(content: string, filename: string, page: number): Chunk {
  const chunkId = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const filetype = filename.split(".").pop() || "txt"
  const hash = generateChunkHash(filename, filetype, chunkId, content)
  return {
    chunk_id: chunkId,
    chunk_hash: hash,
    previous_hash: null,
    filename,
    filetype: filename.split(".").pop() || "txt",
    page_number: page,
    page_content: content,
    status: "new",
    lastEdited: new Date().toISOString(),
    originalHash: hash,
  }
}
