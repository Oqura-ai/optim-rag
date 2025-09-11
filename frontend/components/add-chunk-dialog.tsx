"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface AddChunkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingFiles: string[]
  onAddChunk: (filename: string, page: number) => void
}

export function AddChunkDialog({ open, onOpenChange, existingFiles, onAddChunk }: AddChunkDialogProps) {
  const [mode, setMode] = useState<"existing" | "new">("existing")
  const [selectedFile, setSelectedFile] = useState<string>("")
  const [newFilename, setNewFilename] = useState<string>("")
  const [page, setPage] = useState<number>(1)

  const handleSubmit = () => {
    const filename = mode === "existing" ? selectedFile : newFilename
    if (!filename.trim()) return

    onAddChunk(filename, page)
    onOpenChange(false)

    // Reset form
    setSelectedFile("")
    setNewFilename("")
    setPage(1)
    setMode("existing")
  }

  const canSubmit = mode === "existing" ? selectedFile : newFilename.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Chunk</DialogTitle>
          <DialogDescription>Choose whether to add a chunk to an existing file or create a new file.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={mode} onValueChange={(value) => setMode(value as "existing" | "new")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" disabled={existingFiles.length === 0} />
              <Label htmlFor="existing" className={existingFiles.length === 0 ? "text-slate-400" : ""}>
                Add to existing file
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="new" id="new" />
              <Label htmlFor="new">Create new file</Label>
            </div>
          </RadioGroup>

          {mode === "existing" && existingFiles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="file-select">Select File</Label>
              <Select value={selectedFile} onValueChange={setSelectedFile}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a file..." />
                </SelectTrigger>
                <SelectContent>
                  {existingFiles.map((filename) => (
                    <SelectItem key={filename} value={filename}>
                      {filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "new" && (
            <div className="space-y-2">
              <Label htmlFor="new-filename">New Filename</Label>
              <Input
                id="new-filename"
                value={newFilename}
                onChange={(e) => setNewFilename(e.target.value)}
                placeholder="e.g., document.md"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="page-number">Page Number</Label>
            <Input
              id="page-number"
              type="number"
              value={page}
              onChange={(e) => setPage(Number.parseInt(e.target.value) || 1)}
              min="1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Add Chunk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
