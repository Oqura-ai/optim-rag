"use client";

import { useEffect, useState } from "react";
import type { Chunk, UploadedFile } from "@/types/chunk"
import { createNewChunk } from "@/lib/chunk-utils";
import { ChunkList } from "@/components/chunk-list";
import { MarkdownEditor } from "@/components/markdown-editor";
import { Toaster } from "@/components/ui/toaster";
import { getChunks } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Trash2 } from "lucide-react";
import { listSessions, createSession as feCreateSession } from "@/lib/api-session";
import { deleteSession as feDeleteSession } from "@/lib/api";

export default function ChunkEditor() {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [wordLimit, setWordLimit] = useState<number>(500);
  const [sessionId, setSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]) // Added uploaded files state

  type SessionMeta = { id: string; createdAt: string; name?: string; archiveName?: string; archiveSize?: number }
  const [sessions, setSessions] = useState<SessionMeta[]>([])
  const [newSessionZip, setNewSessionZip] = useState<File | null>(null)
  const [newSessionName, setNewSessionName] = useState<string>("")
  const [isSessionOp, setIsSessionOp] = useState<boolean>(false)

  useEffect(() => {
    // Load sessions from front-end store on first render of popup
    ;(async () => {
      const all = await listSessions()
      setSessions(all)
    })()
  }, [])

  const selectedChunk =
    chunks.find((chunk) => chunk.chunk_id === selectedChunkId) || null;

  const handleLoadChunks = async () => {
    if (!sessionId.trim()) {
      setError("Please enter a session ID");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getChunks(sessionId.trim());

      console.log(response);

      // Transform API chunks to frontend format
      const transformedChunks: Chunk[] = response.chunks.map(
        (apiChunk, index) => ({
          chunk_id: `chunk_${Date.now()}_${index}`,
          chunk_hash: apiChunk.chunk_hash,
          previous_hash: apiChunk.previous_hash,
          filename: apiChunk.filename || "unknown.txt",
          filetype: apiChunk.filetype || "txt",
          page_number: apiChunk.page_number || 1,
          page_content: apiChunk.page_content,
          status: "unchanged" as const,
          originalHash: apiChunk.chunk_hash,
        })
      );

      setChunks(transformedChunks);

      // Calculate word limit based on largest chunk
      if (transformedChunks.length > 0) {
        const maxWords = Math.max(
          ...transformedChunks.map(
            (chunk) => chunk.page_content.split(/\s+/).length
          )
        );
        setWordLimit(maxWords);
        setSelectedChunkId(transformedChunks[0].chunk_id);
        console.log(transformedChunks);
      }

      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chunks");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChunk = (chunkId: string) => {
    setSelectedChunkId(chunkId);
  };

  const handleSaveChunk = (updatedChunk: Chunk) => {
    setChunks((prevChunks) =>
      prevChunks.map((chunk) =>
        chunk.chunk_id === updatedChunk.chunk_id ? updatedChunk : chunk
      )
    );
  };

  const handleAddChunk = (filename: string, page_number: number) => {
    const newChunk = createNewChunk(
      "# New Chunk\n\nStart editing your content here...",
      filename,
      page_number
    );
    setChunks((prevChunks) => [...prevChunks, newChunk]);
    setSelectedChunkId(newChunk.chunk_id);
  };

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFiles((prevFiles) => [...prevFiles, file])
  }

  const handleFileDelete = (fileId: string) => {
    setUploadedFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId))
  }

  const handleDeleteFile = (filename: string) => {
    setChunks((prevChunks) =>
      prevChunks.map((chunk) => (chunk.filename === filename ? { ...chunk, status: "deleted" as const } : chunk)),
    )

    // If the selected chunk belongs to the deleted file, select another chunk
    const selectedChunk = chunks.find((chunk) => chunk.chunk_id === selectedChunkId)
    if (selectedChunk && selectedChunk.filename === filename) {
      const remainingChunks = chunks.filter((chunk) => chunk.filename !== filename && chunk.status !== "deleted")
      if (remainingChunks.length > 0) {
        setSelectedChunkId(remainingChunks[0].chunk_id)
      } else {
        setSelectedChunkId(null)
      }
    }
  }

  const handleCommitSuccess = () => {
    setChunks((prevChunks) =>
      prevChunks
        // 1. Remove deleted ones
        .filter((chunk) => chunk.status !== "deleted")
        // 2. Reset everything else to unchanged
        .map((chunk) => ({
          ...chunk,
          status: "unchanged",
          originalHash: chunk.chunk_hash,
          lastEdited: undefined,
        }))
    );

    setUploadedFiles((prevFiles) =>
      prevFiles.map((file) => ({
        ...file,
        status: "committed" as const,
      })),
    )
  };

  if (!isInitialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Session Manager</CardTitle>
            <CardDescription>
              Create, list, or delete sessions on the front-end. You can still load any session by ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing Sessions */}
            <section>
              <h3 className="text-sm font-medium mb-2">Existing Sessions</h3>
              <div className="rounded border p-3 max-h-56 overflow-auto">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sessions yet. Create one below.</p>
                ) : (
                  <ul className="space-y-2">
                    {sessions.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-pretty">{s.name || s.id}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            ID: {s.id} • {new Date(s.createdAt).toLocaleString()}
                            {s.archiveName ? ` • ZIP: ${s.archiveName}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSessionId(s.id)}
                            title="Use this session ID"
                          >
                            Use
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={async () => {
                              try {
                                setIsSessionOp(true)
                                await feDeleteSession(s.id)
                                const all = await listSessions()
                                setSessions(all)
                                if (sessionId === s.id) setSessionId("")
                              } finally {
                                setIsSessionOp(false)
                              }
                            }}
                            disabled={isSessionOp}
                            aria-label={`Delete session ${s.name || s.id}`}
                            title="Delete session"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Create New Session */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium">Create New Session</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newSessionName">Session Name (optional)</Label>
                  <Input
                    id="newSessionName"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    placeholder="e.g., Q3 Reports"
                    disabled={isSessionOp}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipUpload">Upload ZIP</Label>
                  <Input
                    id="zipUpload"
                    type="file"
                    accept=".zip"
                    onChange={(e) => setNewSessionZip(e.target.files?.[0] || null)}
                    disabled={isSessionOp}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    if (!newSessionZip) {
                      setError("Please select a ZIP file to create a session")
                      return
                    }
                    try {
                      setError(null)
                      setIsSessionOp(true)
                      const created = await feCreateSession(newSessionZip, newSessionName)
                      const all = await listSessions()
                      setSessions(all)
                      setSessionId(created.id) // Prefill to allow quick load
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Failed to create session")
                    } finally {
                      setIsSessionOp(false)
                    }
                  }}
                  disabled={isSessionOp || !newSessionZip}
                >
                  {isSessionOp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    "Create Session"
                  )}
                </Button>
              </div>
            </section>

            {/* Manual Session ID + Load */}
            <section className="space-y-2">
              <Label htmlFor="sessionId">Manual Session ID</Label>
              <Input
                id="sessionId"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID..."
                disabled={isLoading || isSessionOp}
              />
            </section>

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
      <div className="w-fit flex-shrink-0">
        <ChunkList
          chunks={chunks.filter((chunk) => chunk.status !== "deleted")}
          selectedChunkId={selectedChunkId}
          onSelectChunk={handleSelectChunk}
          onAddChunk={handleAddChunk}
          wordLimit={wordLimit}
          onWordLimitChange={setWordLimit}
          onCommitSuccess={handleCommitSuccess}
          sessionId={sessionId}
          uploadedFiles={uploadedFiles}
          onFileUpload={handleFileUpload}
          onFileDelete={handleFileDelete}
          onDeleteFile={handleDeleteFile} // Added file deletion handler
        />
      </div>

      {/* Main Panel - Markdown Editor with Metadata */}
      <div className="flex-1">
        <MarkdownEditor
          chunk={selectedChunk}
          onSave={handleSaveChunk}
          wordLimit={wordLimit}
        />
      </div>

      <Toaster />
    </div>
  )
}
