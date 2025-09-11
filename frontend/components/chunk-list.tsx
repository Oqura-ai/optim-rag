"use client"

import { useState } from "react"
import type { Chunk } from "@/types/chunk"
import { ChunkStatusIndicator } from "./chunk-status-indicator"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, Plus, Settings, ChevronDown, ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AddChunkDialog } from "./add-chunk-dialog"

interface ChunkListProps {
  chunks: Chunk[]
  selectedChunkId: string | null
  onSelectChunk: (chunkId: string) => void
  onAddChunk: (filename: string, page: number) => void // Updated to accept filename and page
  wordLimit: number
  onWordLimitChange: (limit: number) => void
}

export function ChunkList({
  chunks,
  selectedChunkId,
  onSelectChunk,
  onAddChunk,
  wordLimit,
  onWordLimitChange,
}: ChunkListProps) {
  const [openFiles, setOpenFiles] = useState<Record<string, boolean>>({})
  const [showSettings, setShowSettings] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false) // Added state for add dialog

  // Group chunks by filename
  const groupedChunks = chunks.reduce(
    (acc, chunk) => {
      if (!acc[chunk.filename]) {
        acc[chunk.filename] = []
      }
      acc[chunk.filename].push(chunk)
      return acc
    },
    {} as Record<string, Chunk[]>,
  )

  const existingFiles = Object.keys(groupedChunks) // Get list of existing files

  const toggleFile = (filename: string) => {
    setOpenFiles((prev) => ({
      ...prev,
      [filename]: !prev[filename],
    }))
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 border-r border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Document Chunks</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="ghost"
              size="sm"
              className="text-slate-700 hover:bg-slate-100"
            >
              <Settings size={16} />
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)} // Open dialog instead of direct add
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={16} />
              Add Chunk
            </Button>
          </div>
        </div>

        {showSettings && (
          <div className="mb-3 p-3 bg-slate-100 rounded-md">
            <Label htmlFor="word-limit" className="text-sm font-medium text-slate-900">
              Word Limit
            </Label>
            <Input
              id="word-limit"
              type="number"
              value={wordLimit}
              onChange={(e) => onWordLimitChange(Number.parseInt(e.target.value) || 0)}
              className="mt-1"
              min="1"
            />
            <p className="text-xs text-slate-600 mt-1">Maximum words per chunk</p>
          </div>
        )}

        <p className="text-sm text-slate-600">
          {chunks.length} chunks across {Object.keys(groupedChunks).length} files
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {Object.entries(groupedChunks).map(([filename, fileChunks]) => {
            const isOpen = openFiles[filename] !== false // Default to open
            return (
              <Collapsible key={filename} open={isOpen} onOpenChange={() => toggleFile(filename)}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-2 hover:bg-slate-100 rounded-md text-slate-900">
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <FileText size={16} />
                  <span className="text-sm font-medium">{filename}</span>
                  <span className="text-xs text-slate-500 ml-auto">({fileChunks.length})</span>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-2 ml-6 mt-2">
                  {fileChunks.map((chunk) => {
                    const wordCount = chunk.data.split(/\s+/).length
                    const isOverLimit = wordCount > wordLimit

                    return (
                      <Card
                        key={chunk.chunk_id}
                        className={`p-3 cursor-pointer transition-colors hover:bg-slate-100 ${
                          selectedChunkId === chunk.chunk_id
                            ? "bg-slate-200 border-primary"
                            : "bg-white border-slate-200"
                        } ${isOverLimit ? "border-destructive/50" : ""}`}
                        onClick={() => onSelectChunk(chunk.chunk_id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-900">Page {chunk.page}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                isOverLimit ? "bg-destructive/20 text-destructive" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {wordCount}w
                            </span>
                            <ChunkStatusIndicator status={chunk.status} size="sm" />
                          </div>
                        </div>

                        <div className="text-xs text-slate-500 mb-2">ID: {chunk.chunk_id.slice(0, 12)}...</div>

                        <div className="text-sm text-slate-700 line-clamp-2">{chunk.data.slice(0, 80)}...</div>
                      </Card>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>
      </ScrollArea>

      <AddChunkDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        existingFiles={existingFiles}
        onAddChunk={onAddChunk}
      />
    </div>
  )
}
