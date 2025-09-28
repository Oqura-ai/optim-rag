import { Chunk } from "@/types/chunk";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

// --- 1. Get all chunks ---
export async function getChunks(sessionId: string) {
  const res = await fetch(`${API_URL}/chunks/${sessionId}`, {
    method: "GET",
  })
  if (!res.ok) throw new Error("Failed to fetch chunks")
  return res.json() as Promise<{ session_id: string; chunks: Chunk[] }>
}

// --- 2. Update chunks ---
export async function updateChunks(sessionId: string, documents: Chunk[]) {
  const res = await fetch(`${API_URL}/chunks/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, documents }),
  })
  if (!res.ok) throw new Error("Failed to update chunks")
  return res.json()
}

// --- 3. Delete a session ---
export async function deleteSession(sessionId: string) {
  const res = await fetch(`${API_URL}/session/${sessionId}`, {
    method: "DELETE",
  })
  if (!res.ok) throw new Error("Failed to delete session")
  return res.json()
}

// --- 4. Upload files ---
export async function uploadFiles(sessionId: string, files: File[]) {
  const formData = new FormData()
  formData.append("session_id", sessionId)

  files.forEach((file, index) => {
    formData.append(`files`, file)
  })

  const res = await fetch(`${API_URL}/files/upload`, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) throw new Error("Failed to upload files")
  return res.json()
}


