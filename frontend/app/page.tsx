"use client"

import { useState } from "react"
import type { Chunk } from "@/types/chunk"
import { createNewChunk } from "@/lib/chunk-utils"
import { ChunkList } from "@/components/chunk-list"
import { MarkdownEditor } from "@/components/markdown-editor"
import { Toaster } from "@/components/ui/toaster"

// Sample data for demonstration
const sampleChunks: Chunk[] = [
  {
    chunk_id: "chunk_1694123456789_abc123def",
    chunk_hash: "a1b2c3d4",
    filename: "report.docx",
    filetype: "docx",
    page: 1,
    data: "# Executive Summary\n\nThis report provides a comprehensive analysis of our quarterly performance. The key findings indicate significant growth in user engagement and revenue streams.\n\n## Key Metrics\n- User growth: 25%\n- Revenue increase: 18%\n- Customer satisfaction: 92%",
    status: "unchanged",
    originalHash: "a1b2c3d4",
  },
  {
    chunk_id: "chunk_1694123456790_def456ghi",
    chunk_hash: "e5f6g7h8",
    filename: "report.docx",
    filetype: "docx",
    page: 1,
    data: "## Market Analysis\n\nThe current market conditions show favorable trends for our product category. Competition remains strong, but our unique value proposition continues to differentiate us.\n\n### Competitive Landscape\n- Direct competitors: 3 major players\n- Market share: 15% (up from 12%)\n- Growth opportunities in emerging markets",
    status: "modified",
    originalHash: "e5f6g7h7",
    lastEdited: "2025-01-11T10:30:00Z",
  },
  {
    chunk_id: "chunk_1694123456791_ghi789jkl",
    chunk_hash: "i9j0k1l2",
    filename: "technical-spec.md",
    filetype: "md",
    page: 2,
    data: '# Technical Specifications\n\n## Architecture Overview\n\nOur system follows a microservices architecture with the following components:\n\n```javascript\nconst apiEndpoint = "https://api.example.com/v1";\nconst authToken = process.env.AUTH_TOKEN;\n```\n\n### Core Services\n1. Authentication Service\n2. Data Processing Service\n3. Notification Service',
    status: "unchanged",
    originalHash: "i9j0k1l2",
  },
  {
    chunk_id: "chunk_1694123456792_jkl012mno",
    chunk_hash: "m3n4o5p6",
    filename: "user-guide.txt",
    filetype: "txt",
    page: 3,
    data: "Getting Started Guide\n\nWelcome to our platform! This guide will help you get up and running quickly.\n\nStep 1: Create your account\nStep 2: Verify your email\nStep 3: Complete your profile\nStep 4: Start using the features\n\nFor additional help, contact our support team at support@example.com",
    status: "new",
    originalHash: "m3n4o5p6",
    lastEdited: "2025-01-11T11:15:00Z",
  },
]

export default function ChunkEditor() {
  const [chunks, setChunks] = useState<Chunk[]>(sampleChunks)
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(sampleChunks[0]?.chunk_id || null)
  const [wordLimit, setWordLimit] = useState<number>(() => {
    const maxWords = Math.max(...sampleChunks.map((chunk) => chunk.data.split(/\s+/).length))
    return maxWords
  })

  const selectedChunk = chunks.find((chunk) => chunk.chunk_id === selectedChunkId) || null

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
    // Updated to accept filename and page parameters
    const newChunk = createNewChunk("# New Chunk\n\nStart editing your content here...", filename, page)

    setChunks((prevChunks) => [...prevChunks, newChunk])
    setSelectedChunkId(newChunk.chunk_id)
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
