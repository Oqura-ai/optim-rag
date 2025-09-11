"use client"

import type { Chunk } from "@/types/chunk"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChunkStatusIndicator } from "./chunk-status-indicator"
import { Copy, FileText, Hash, Calendar, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MetadataPanelProps {
  chunk: Chunk | null
}

export function MetadataPanel({ chunk }: MetadataPanelProps) {
  const { toast } = useToast()

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: `${label} copied successfully`,
    })
  }

  if (!chunk) {
    return (
      <div className="h-full bg-sidebar border-l border-sidebar-border p-4">
        <div className="text-center text-muted-foreground">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-sm">No chunk selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-sidebar border-l border-sidebar-border overflow-y-auto">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-sidebar-foreground mb-2">Metadata</h2>
        <ChunkStatusIndicator status={chunk.status} />
      </div>

      <div className="p-4 space-y-4">
        {/* Basic Information */}
        <Card className="bg-sidebar-primary border-sidebar-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-sidebar-primary-foreground flex items-center gap-2">
              <FileText size={16} />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Filename</label>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-sidebar-primary-foreground">{chunk.filename}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(chunk.filename, "Filename")}
                  className="h-6 w-6 p-0"
                >
                  <Copy size={12} />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">File Type</label>
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">
                  {chunk.filetype.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Page</label>
              <div className="flex items-center gap-2 mt-1">
                <MapPin size={14} className="text-muted-foreground" />
                <span className="text-sm text-sidebar-primary-foreground">{chunk.page}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chunk Details */}
        <Card className="bg-sidebar-primary border-sidebar-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-sidebar-primary-foreground flex items-center gap-2">
              <Hash size={16} />
              Chunk Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Chunk ID</label>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-sidebar-primary-foreground font-mono">
                  {chunk.chunk_id.slice(0, 16)}...
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(chunk.chunk_id, "Chunk ID")}
                  className="h-6 w-6 p-0"
                >
                  <Copy size={12} />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Current Hash</label>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-sidebar-primary-foreground font-mono">{chunk.chunk_hash}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(chunk.chunk_hash, "Hash")}
                  className="h-6 w-6 p-0"
                >
                  <Copy size={12} />
                </Button>
              </div>
            </div>

            {chunk.originalHash && chunk.originalHash !== chunk.chunk_hash && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Original Hash</label>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-sidebar-primary-foreground font-mono">{chunk.originalHash}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(chunk.originalHash!, "Original Hash")}
                    className="h-6 w-6 p-0"
                  >
                    <Copy size={12} />
                  </Button>
                </div>
              </div>
            )}

            {chunk.lastEdited && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Last Edited</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={14} className="text-muted-foreground" />
                  <span className="text-sm text-sidebar-primary-foreground">
                    {new Date(chunk.lastEdited).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Statistics */}
        <Card className="bg-sidebar-primary border-sidebar-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-sidebar-primary-foreground">Content Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Characters:</span>
              <span className="text-sidebar-primary-foreground">{chunk.data.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Words:</span>
              <span className="text-sidebar-primary-foreground">
                {chunk.data.split(/\s+/).filter((word) => word.length > 0).length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lines:</span>
              <span className="text-sidebar-primary-foreground">{chunk.data.split("\n").length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Export Actions */}
        <Card className="bg-sidebar-primary border-sidebar-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-sidebar-primary-foreground">Export</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(JSON.stringify(chunk, null, 2), "Chunk JSON")}
              className="w-full"
            >
              <Copy size={14} />
              Copy JSON
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
