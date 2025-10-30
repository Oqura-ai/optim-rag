import { Chunk } from "@/types/chunk";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
const CHAT_STORAGE_PREFIX = "chat-history:"

// --- 1. Get all chunks ---
export async function getChunks(sessionId: string) {
  const res = await fetch(`${API_URL}/chunks/${sessionId}`, {
    method: "GET",
  })
  if (!res.ok) throw new Error("Failed to fetch chunks")
  return res.json() as Promise<{ session_id: string; chunks: Chunk[] }>
}

// --- 2. Update chunks ---
export async function updateChunks(sessionId: string, sessionName:string, documents: Chunk[]) {
  const res = await fetch(`${API_URL}/chunks/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, session_name: sessionName, documents }),
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
export async function uploadFiles(sessionId: string, sessionName: string, files: File[]) {
  const formData = new FormData()
  formData.append("session_id", sessionId)
  formData.append("session_name", sessionName)

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

// --- 5. Chat functionality ---
export type ChatRole = "developer" | "user" | "assistant"
export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatHistory {
  session_id: string
  messages: ChatMessage[]
}

export type ChatModel = "gpt-5" | "ollama-local"

function getStorageKey(sessionId: string, model: ChatModel) {
  return `${CHAT_STORAGE_PREFIX}${sessionId}:${model}`
}

function readChatFromStorage(sessionId: string, model: ChatModel): ChatHistory {
  if (typeof window === "undefined") return { session_id: sessionId, messages: [] }
  const key = getStorageKey(sessionId, model)
  const raw = window.localStorage.getItem(key)
  if (!raw) return { session_id: sessionId, messages: [] }
  try {
    return JSON.parse(raw) as ChatHistory
  } catch {
    return { session_id: sessionId, messages: [] }
  }
}

function writeChatToStorage(sessionId: string, model: ChatModel, history: ChatHistory) {
  if (typeof window === "undefined") return
  const key = getStorageKey(sessionId, model)
  window.localStorage.setItem(key, JSON.stringify(history))
}

// Delete chat messages for a session and model
export function deleteChat(sessionId: string, model: ChatModel) {
  if (typeof window === "undefined") return
  const key = getStorageKey(sessionId, model)
  window.localStorage.removeItem(key)
}

// Fetch chat history
export async function getChatHistory(sessionId: string, model: ChatModel = "ollama-local"): Promise<ChatHistory> {
  return readChatFromStorage(sessionId, model)
}

// Send chat messages
export async function sendChat(
  session_id: string,
  messages: ChatMessage[],
  model: ChatModel = "ollama-local",
): Promise<{ session_id: string; reply: ChatMessage; messages?: ChatMessage[] }> {
  // Read prior messages from localStorage
  const prior = readChatFromStorage(session_id, model)

  // Call backend /chat/send for the assistant reply
  const res = await fetch(`${API_URL}/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: session_id, messages, model }),
  })
  if (!res.ok) throw new Error("Failed to send chat")

  const data: { session_id: string; reply: ChatMessage; messages: ChatMessage[] } = await res.json()

  // Combine prior messages, current messages, and backend reply
  const updated: ChatHistory = {
    session_id,
    messages: [...messages, data.reply],
  }

  // Save to localStorage
  writeChatToStorage(session_id, model, updated)

  return { session_id, reply: data.reply, messages: updated.messages }
}
