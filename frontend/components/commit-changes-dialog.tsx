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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Upload } from "lucide-react"
import { updateChunks, uploadFiles } from "@/lib/api"
import type { Chunk, UploadedFile } from "@/types/chunk"
import { useToast } from "@/hooks/use-toast"

interface CommitChangesDialogProps {
  chunks: Chunk[]
  onCommitSuccess?: () => void
  sessionId: string
  sessionName: string
  uploadedFiles?: UploadedFile[] // Added uploaded files prop
}

export function CommitChangesDialog({ chunks, onCommitSuccess, sessionId, sessionName, uploadedFiles = []}: CommitChangesDialogProps) {
  const [open, setOpen] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const { toast } = useToast()

  const modifiedChunks = chunks.filter((chunk) => chunk.status === "modified").length
  const newChunks = chunks.filter((chunk) => chunk.status === "new").length
  const deletedChunks = chunks.filter((chunk) => chunk.status === "deleted").length
  // const totalChanges = modifiedChunks + newChunks + deletedChunks
  const newUploadedFiles = uploadedFiles.filter((file) => file.status === "new").length // Count new uploaded files
  const totalChanges = modifiedChunks + newChunks + deletedChunks + newUploadedFiles // Include uploaded files in total

  const handleCommit = async () => {
    setIsCommitting(true)
    try {
      const newFiles = uploadedFiles.filter((f) => f.status === "new")
      if (newFiles.length > 0) {
        const filesToUpload = newFiles.map((f) => f.file).filter(Boolean) as File[]
        if (filesToUpload.length > 0) {
          await uploadFiles(sessionId, sessionName, filesToUpload)
        }
      }

      await updateChunks(sessionId, sessionName, chunks)

      toast({
        title: "Changes Committed Successfully",
        description: `${totalChanges} changes have been saved to the `,
      })

      setOpen(false)
      onCommitSuccess?.()
    } catch (error) {
      console.error("Failed to commit changes:", error)
      toast({
        title: "Commit Failed",
        description: error instanceof Error ? error.message : "Failed to commit changes to ",
        variant: "destructive",
      })
    } finally {
      setIsCommitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl" disabled={totalChanges === 0}>
          <Upload className="w-4 h-4 mr-2" />
          Commit Changes ({totalChanges})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Commit Changes to Backend</DialogTitle>
          <DialogDescription>Review your changes before committing them to session: {sessionId}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg space-y-2">
            <h4 className="font-medium text-slate-900">Changes Summary:</h4>
            <div className="text-sm text-slate-600 space-y-1">
              {newChunks > 0 && (
                <div>
                  • {newChunks} new chunk{newChunks !== 1 ? "s" : ""}
                </div>
              )}
              {modifiedChunks > 0 && (
                <div>
                  • {modifiedChunks} modified chunk{modifiedChunks !== 1 ? "s" : ""}
                </div>
              )}
              {deletedChunks > 0 && (
                <div>
                  • {deletedChunks} deleted chunk{deletedChunks !== 1 ? "s" : ""}
                </div>
              )}
              {totalChanges === 0 && <div>• No changes to commit</div>}
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Session Name:</strong> {sessionName}<br/>
              <strong>Session ID:</strong> {sessionId}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isCommitting}>
            Cancel
          </Button>
          <Button onClick={handleCommit} disabled={isCommitting || totalChanges === 0}>
            {isCommitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isCommitting ? "Committing..." : "Commit Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
