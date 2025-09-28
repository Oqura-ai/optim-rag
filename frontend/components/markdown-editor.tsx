"use client"

import { useState, useEffect } from "react"
import type { Chunk } from "@/types/chunk"
import { deleteChunk, updateChunkStatus } from "@/lib/chunk-utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Save,
  RotateCcw,
  Trash2,
  Bold,
  Italic,
  Code,
  List,
  Hash,
  FileText,
  Calendar,
  HashIcon,
  AlertTriangle,
  Eye,
  Edit3,
} from "lucide-react"
import { ChunkStatusIndicator } from "./chunk-status-indicator"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import MarkdownRenderer from "./markdown-renderer"

interface MarkdownEditorProps {
  chunk: Chunk | null
  onSave: (chunk: Chunk) => void
  wordLimit: number
}

export function MarkdownEditor({ chunk, onSave, wordLimit }: MarkdownEditorProps) {
  const [content, setContent] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isViewMode, setIsViewMode] = useState(false)

  useEffect(() => {
    if (chunk) {
      setContent(chunk.page_content)
      setHasUnsavedChanges(false)
    }
  }, [chunk])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setHasUnsavedChanges(true)
  }

  const handleSave = () => {
    if (!chunk) return

    const updatedChunk = updateChunkStatus(chunk, content)
    onSave(updatedChunk)
    setHasUnsavedChanges(false)
  }

  const handleDeleteChunk = () => {
    if (!chunk) return

    const updatedChunk = deleteChunk(chunk)
    onSave(updatedChunk)
    setHasUnsavedChanges(false)
  }

  const handleRevert = () => {
    if (chunk) {
      setContent(chunk.page_content)
      setHasUnsavedChanges(false)
    }
  }

  const insertMarkdown = (before: string, after = "") => {
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end)

    setContent(newContent)
    setHasUnsavedChanges(true)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length
  const isOverLimit = wordCount > wordLimit

  if (!chunk) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a chunk to start editing</p>
          <p className="text-sm">Choose a chunk from the sidebar to begin editing its content</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-card-foreground">
              Editing Chunk: {chunk.chunk_id.slice(0, 12)}...
            </h2>
            <ChunkStatusIndicator status={hasUnsavedChanges ? "modified" : chunk.status} />
            <div className="flex items-center gap-2">
              <Badge variant={isOverLimit ? "destructive" : "secondary"} className="text-xs">
                {wordCount}/{wordLimit} words
              </Badge>
              {isOverLimit && <AlertTriangle size={16} className="text-destructive" />}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsViewMode(!isViewMode)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {isViewMode ? <Edit3 size={16} /> : <Eye size={16} />}
              {isViewMode ? "Edit" : "Preview"}
            </Button>
            <Button onClick={handleRevert} variant="outline" size="sm" disabled={!hasUnsavedChanges}>
              <RotateCcw size={16} />
              Revert
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              disabled={!hasUnsavedChanges}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save size={16} />
              Save
            </Button>
            <Button onClick={handleDeleteChunk} variant="destructive" size="sm">
              <Trash2 size={16} />
              Delete
            </Button>
          </div>
        </div>

        {!isViewMode && (
          <div className="flex items-center gap-1 p-2 bg-muted rounded-md">
            <Button variant="ghost" size="sm" onClick={() => insertMarkdown("**", "**")} className="h-8 w-8 p-0">
              <Bold size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => insertMarkdown("*", "*")} className="h-8 w-8 p-0">
              <Italic size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => insertMarkdown("`", "`")} className="h-8 w-8 p-0">
              <Code size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => insertMarkdown("# ")} className="h-8 w-8 p-0">
              <Hash size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => insertMarkdown("- ")} className="h-8 w-8 p-0">
              <List size={14} />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-4">
          {isViewMode ? (
              <MarkdownRenderer content={content} />
          ) : (
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Enter your markdown content here..."
              className={`h-full resize-none font-mono text-sm leading-relaxed ${
                isOverLimit ? "border-destructive focus:border-destructive" : ""
              }`}
            />
          )}
        </div>

        <div className="w-80 p-4 border-l border-border bg-slate-50">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Chunk Metadata</h3>

          <div className="space-y-4">
            <Card className="p-4 bg-white border-slate-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" />
                  <span className="text-sm font-medium text-slate-900">File Information</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Filename:</span>
                    <span className="font-mono text-slate-900">{chunk.filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">File Type:</span>
                    <Badge variant="outline">{chunk.filetype.toUpperCase()}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Page:</span>
                    <span className="text-slate-900">{chunk.page_number}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white border-slate-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <HashIcon size={16} className="text-slate-500" />
                  <span className="text-sm font-medium text-slate-900">Chunk Details</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Chunk ID:</span>
                    <span className="font-mono text-xs text-slate-900">{chunk.chunk_id.slice(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Status:</span>
                    <ChunkStatusIndicator status={hasUnsavedChanges ? "modified" : chunk.status} />
                  </div>
                </div>
              </div>
            </Card>

            {chunk.lastEdited && (
              <Card className="p-4 bg-white border-slate-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-500" />
                    <span className="text-sm font-medium text-slate-900">Edit History</span>
                  </div>

                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Last Edited:</span>
                      <span className="text-slate-900">{new Date(chunk.lastEdited).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-4 bg-white border-slate-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" />
                  <span className="text-sm font-medium text-slate-900">Content Statistics</span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Word Count:</span>
                    <span className={`text-slate-900 ${isOverLimit ? "text-destructive font-medium" : ""}`}>
                      {wordCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Character Count:</span>
                    <span className="text-slate-900">{content.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Lines:</span>
                    <span className="text-slate-900">{content.split("\n").length}</span>
                  </div>
                  {isOverLimit && (
                    <div className="text-xs text-destructive mt-2 p-2 bg-destructive/10 rounded">
                      ⚠️ Content exceeds word limit by {wordCount - wordLimit} words
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
