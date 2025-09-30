/**
 * Session store (front-end only) using localStorage with simulated latency.
 * File name intentionally .js per request.
 */

import { generateSessionId } from "@/lib/chunk-transform"

const STORAGE_KEY = "chunkwise_sessions_v1"
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

// Minimal session meta we track on the front-end
// Using JSDoc for editor intellisense while remaining JS.
/**
 * @typedef {Object} SessionMeta
 * @property {string} id
 * @property {string} createdAt
 * @property {string=} name
 * @property {string=} archiveName
 * @property {number=} archiveSize
 */

function readSessions() {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeSessions(sessions: any) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // ignore write failures
  }
}

function delay(ms = 400) {
  return new Promise((res) => setTimeout(res, ms))
}

/**
 * List all sessions (front-end only)
 * @returns {Promise<SessionMeta[]>}
 */
export async function listSessions() {
  await delay()
  try {
    const res = await fetch(`${API_URL}/sessions`, { cache: "no-store" })
    if (res.ok) {
      const serverSessions = await res.json()
      // Sync to local for front-end-only tracking
      writeSessions(serverSessions || [])
      return serverSessions || []
    }
  } catch (err) {
    // ignore and fall back
  }
  return readSessions()
}

/**
 * Create a new session by uploading a ZIP (simulated).
 * Generates a random session ID on the front-end.
 * @param {File} zipFile - must be a .zip file (enforced by caller UI)
 * @param {string=} name
 * @returns {Promise<SessionMeta>}
 */
export async function createSession(zipFile: any, name: any) {
  await delay()

  // Try backend first if a zip is provided
  if (zipFile instanceof File) {
    try {
      const form = new FormData()
      form.append("archive", zipFile, zipFile.name)
      if (name && String(name).trim()) form.append("name", String(name).trim())

      const res = await fetch(`${API_URL}/sessions`, {
        method: "POST",
        body: form,
      })

      if (res.ok) {
        const created = await res.json()
        const id = created?.id
        // Compose front-end meta for tracking
        const session = {
          id: id || created?.sessionId || created?.uuid || created?.slug || created?.name || crypto.randomUUID(),
          createdAt: created?.createdAt || new Date().toISOString(),
          name:
            created?.name ||
            (name?.trim ? name.trim() : zipFile?.name ? zipFile.name.replace(/\.zip$/i, "") : undefined),
          archiveName: zipFile?.name || undefined,
          archiveSize: zipFile?.size || undefined,
        }

        const sessions = readSessions()
        sessions.unshift(session)
        writeSessions(sessions)
        return session
      }
    } catch (err) {
      // fall back to local-only path
    }
  }

  // Fallback: purely front-end session generation
  const id = generateSessionId()
  const session = {
    id,
    createdAt: new Date().toISOString(),
    name: name?.trim ? name.trim() : zipFile?.name ? zipFile.name.replace(/\.zip$/i, "") : `Session ${id.slice(-6)}`,
    archiveName: zipFile?.name || undefined,
    archiveSize: zipFile?.size || undefined,
  }

  const sessions = readSessions()
  sessions.unshift(session)
  writeSessions(sessions)
  return session
}

/**
 * Delete an existing session by id (front-end only)
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteSession(id: any) {
  await delay()
  // Update local store optimistically
  const sessions = readSessions().filter((s: any) => s.id !== id)
  writeSessions(sessions)

  try {
    const res = await fetch(`${API_URL}/session/${id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      // If backend fails, restore local state by re-adding? We'll fetch from local snapshot on next list.
      // Intentionally not throwing to avoid UI disruption; log can be added during debugging.
      return
    }
    // Optionally parse response if needed:
    // await res.json()
  } catch {
    // Swallow errors for now; local deletion remains
  }
}

/**
 * Get a single session meta (front-end only)
 * @param {string} id
 * @returns {Promise<SessionMeta | undefined>}
 */
export async function getSession(id: any) {
  await delay()
  try {
    const res = await fetch(`${API_URL}/session/${id}`, { cache: "no-store" })
    if (res.ok) {
      const session = await res.json()
      // Ensure local store has it
      const list = readSessions()
      const idx = list.findIndex((s: any) => s.id === (session?.id || id))
      const normalized = {
        id: session?.id || id,
        createdAt: session?.createdAt || new Date().toISOString(),
        name: session?.name,
        archiveName: session?.archiveName,
        archiveSize: session?.archiveSize,
      }
      if (idx >= 0) list[idx] = { ...list[idx], ...normalized }
      else list.unshift(normalized)
      writeSessions(list)
      return normalized
    }
  } catch {
    // ignore and fall back
  }
  return readSessions().find((s: any) => s.id === id)
}
