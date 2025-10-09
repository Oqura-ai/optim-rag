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
  onAddChunk: (filename: string, page_number: number) => void
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
      <DialogContent className="sm:max-w-md bg-slate-50 rounded-2xl sm:rounded-2xl shadow-lg border-0">
        <DialogHeader>
          <DialogTitle className="text-black">Add New Chunk</DialogTitle>
          <DialogDescription className="text-black">
            Choose whether to add a chunk to an existing file or create a new file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={mode} onValueChange={(value: any) => setMode(value as "existing" | "new")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="existing"
                id="existing"
                disabled={existingFiles.length === 0}
                className=""
              />
              <Label htmlFor="existing" className={`text-sm ${existingFiles.length === 0 ? "text-black" : "text-black"}`}>
                Add to existing file
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="new"
                id="new"
                className=""
              />
              <Label htmlFor="new" className="text-sm text-black">Create new file</Label>
            </div>
          </RadioGroup>

          {mode === "existing" && existingFiles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="file-select" className="text-black">Select File</Label>
              <Select value={selectedFile} onValueChange={setSelectedFile}>
                <SelectTrigger className="bg-slate-100 text-black rounded-2xl border-0 focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Choose a file..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-50 border-0 shadow-md rounded-2xl">
                  {existingFiles.map((filename) => (
                    <SelectItem key={filename} value={filename} className="text-black bg-none cursor-pointer hover:bg-slate-100">
                      {filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "new" && (
            <div className="space-y-2">
              <Label htmlFor="new-filename" className="text-black">New Filename</Label>
              <Input
                id="new-filename"
                value={newFilename}
                onChange={(e) => setNewFilename(e.target.value)}
                placeholder="e.g., document.md"
                className="bg-slate-100 text-black rounded-2xl border-0 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="page-number" className="text-black">Page Number</Label>
            <Input
              id="page-number"
              type="number"
              value={page}
              onChange={(e) => setPage(Number.parseInt(e.target.value) || 1)}
              min="1"
              className="bg-slate-100 text-black rounded-2xl border-0 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl bg-slate-200 text-black hover:bg-slate-300 border-0"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            Add Chunk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
