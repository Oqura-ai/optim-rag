"use client"

import type React from "react"
import { useState, useRef } from "react"
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
import { Upload, File, X } from "lucide-react"
import type { UploadedFile } from "@/types/chunk"

interface FileUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileUpload: (file: UploadedFile) => void
}

export function FileUploadDialog({ open, onOpenChange, onFileUpload }: FileUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const acceptedTypes = [".txt", ".pdf", ".docx", ".md"]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const extension = "." + file.name.split(".").pop()?.toLowerCase()
      if (!acceptedTypes.includes(extension)) {
        alert(`File type not supported. Please upload: ${acceptedTypes.join(", ")}`)
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)

    try {
      const extension = selectedFile.name.split(".").pop()?.toLowerCase() || ""
      const filename = selectedFile.name.replace(/\.[^/.]+$/, "")

      const uploadedFile: UploadedFile = {
        id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        filename,
        extension,
        originalName: selectedFile.name,
        size: selectedFile.size,
        uploadedAt: new Date().toISOString(),
        status: "new",
        path: `../data-source/${selectedFile.name}`,
        file: selectedFile,
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))

      onFileUpload(uploadedFile)
      onOpenChange(false)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (error) {
      console.error("Upload failed:", error)
      alert("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-50 rounded-2xl sm:rounded-2xl shadow-lg border-0">
        <DialogHeader>
          <DialogTitle className="text-black">Upload File</DialogTitle>
          <DialogDescription className="text-black">
            Upload a file to the data-source folder. Supported formats: {acceptedTypes.join(", ")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload" className="text-black">Select File</Label>
            <Input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept={acceptedTypes.join(",")}
              onChange={handleFileSelect}
              className="cursor-pointer bg-slate-100 text-black rounded-2xl border-0 focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-slate-100 rounded-2xl shadow-sm">
              <div className="flex items-center space-x-2">
                <File className="h-4 w-4 text-black" />
                <div>
                  <p className="text-sm font-medium text-black">{selectedFile.name}</p>
                  <p className="text-xs text-black">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="h-8 w-8 p-0 rounded-full hover:bg-slate-200"
              >
                <X className="h-4 w-4 text-black" />
              </Button>
            </div>
          )}
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
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white border-0 min-w-[100px]"
          >
            {isUploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
