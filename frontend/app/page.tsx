"use client"

import { useState } from "react"
import type { Chunk } from "@/types/chunk"
import { createNewChunk } from "@/lib/chunk-utils"
import { ChunkList } from "@/components/chunk-list"
import { MarkdownEditor } from "@/components/markdown-editor"
import { Toaster } from "@/components/ui/toaster"
import { getChunks } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ChunkEditor() {
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null)
  const [wordLimit, setWordLimit] = useState<number>(500)
  const [sessionId, setSessionId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedChunk = chunks.find((chunk) => chunk.chunk_id === selectedChunkId) || null

  const handleLoadChunks = async () => {
    if (!sessionId.trim()) {
      setError("Please enter a session ID")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await getChunks(sessionId.trim())

      // Transform API chunks to frontend format
      const transformedChunks: Chunk[] = response.chunks.map((apiChunk, index) => ({
        chunk_id: `chunk_${Date.now()}_${index}`,
        chunk_hash: apiChunk.chunk_hash,
        filename: apiChunk.metadata?.filename || "unknown.txt",
        filetype: apiChunk.metadata?.extension || "txt",
        page: apiChunk.metadata?.page_number || 1,
        data: apiChunk.page_content,
        status: "unchanged" as const,
        originalHash: apiChunk.chunk_hash,
      }))

      setChunks(transformedChunks)

      // Calculate word limit based on largest chunk
      if (transformedChunks.length > 0) {
        const maxWords = Math.max(...transformedChunks.map((chunk) => chunk.data.split(/\s+/).length))
        setWordLimit(maxWords)
        setSelectedChunkId(transformedChunks[0].chunk_id)
      }

      setIsInitialized(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chunks")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectChunk = (chunkId: string) => {
    setSelectedChunkId(chunkId)
  }

  const handleSaveChunk = (updatedChunk: Chunk) => {
    setChunks((prevChunks) =>
      prevChunks.map((chunk) => (chunk.chunk_id === updatedChunk.chunk_id ? updatedChunk : chunk)),
    )
  }

  const handleDeleteChunk = (chunkId: string) => {
    setChunks((prevChunks) =>
      prevChunks.map((chunk) => (chunk.chunk_id === chunkId ? { ...chunk, status: "deleted" as const } : chunk)),
    )

    // Select next available chunk
    const remainingChunks = chunks.filter((chunk) => chunk.chunk_id !== chunkId && chunk.status !== "deleted")
    if (remainingChunks.length > 0) {
      setSelectedChunkId(remainingChunks[0].chunk_id)
    } else {
      setSelectedChunkId(null)
    }
  }

  const handleAddChunk = (filename: string, page: number) => {
    const newChunk = createNewChunk("# New Chunk\n\nStart editing your content here...", filename, page)
    setChunks((prevChunks) => [...prevChunks, newChunk])
    setSelectedChunkId(newChunk.chunk_id)
  }

  const handleCommitSuccess = () => {
    // Reset all chunks to unchanged status after successful commit
    setChunks((prevChunks) =>
      prevChunks.map((chunk) => ({
        ...chunk,
        status: chunk.status === "deleted" ? "deleted" : "unchanged",
        originalHash: chunk.chunk_hash,
        lastEdited: undefined,
      })),
    )
  }

  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Load Chunks</CardTitle>
            <CardDescription>Enter a session ID to load your chunks from the API</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionId">Session ID</Label>
              <Input
                id="sessionId"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID..."
                disabled={isLoading}
              />
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
            <Button onClick={handleLoadChunks} disabled={isLoading || !sessionId.trim()} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Chunks...
                </>
              ) : (
                "Load Chunks"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Left Panel - Chunk List */}
      <div className="w-80 flex-shrink-0">
        <ChunkList
          chunks={chunks.filter((chunk) => chunk.status !== "deleted")}
          selectedChunkId={selectedChunkId}
          onSelectChunk={handleSelectChunk}
          onAddChunk={handleAddChunk}
          wordLimit={wordLimit}
          onWordLimitChange={setWordLimit}
          onCommitSuccess={handleCommitSuccess}
          sessionId={sessionId}
        />
      </div>

      {/* Main Panel - Markdown Editor with Metadata */}
      <div className="flex-1">
        <MarkdownEditor
          chunk={selectedChunk}
          onSave={handleSaveChunk}
          onDelete={handleDeleteChunk}
          wordLimit={wordLimit}
        />
      </div>

      <Toaster />
    </div>
  )
}
