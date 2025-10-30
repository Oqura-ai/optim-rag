"use client";

import { useEffect, useState } from "react";
import type { Chunk, UploadedFile } from "@/types/chunk";
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
import {
  listSessions,
  createSession as feCreateSession,
} from "@/lib/api-session";
import { deleteSession as feDeleteSession } from "@/lib/api";
import Image from "next/image";
import logo from "@/assets/optim-rag.png";

export default function ChunkEditor() {
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [wordLimit, setWordLimit] = useState<number>(500);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionName, setSessionName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]); // Added uploaded files state

  type SessionMeta = {
    id: string;
    createdAt: string;
    sessionName: string;
    archiveName?: string;
    archiveSize?: number;
  };
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [newSessionZip, setNewSessionZip] = useState<File | null>(null);
  const [newSessionName, setNewSessionName] = useState<string>("");
  const [isSessionOp, setIsSessionOp] = useState<boolean>(false);

  useEffect(() => {
    // Load sessions from front-end store on first render of popup
    (async () => {
      const all = await listSessions();
      setSessions(all);
    })();
  }, []);

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
    setUploadedFiles((prevFiles) => [...prevFiles, file]);
  };

  const handleFileDelete = (fileId: string) => {
    setUploadedFiles((prevFiles) =>
      prevFiles.filter((file) => file.id !== fileId)
    );
  };

  const handleDeleteFileChunks = (filename: string) => {
    setChunks((prevChunks) =>
      prevChunks.map((chunk) =>
        chunk.filename === filename
          ? { ...chunk, status: "deleted" as const }
          : chunk
      )
    );

    // If the selected chunk belongs to the deleted file, select another chunk
    const selectedChunk = chunks.find(
      (chunk) => chunk.chunk_id === selectedChunkId
    );
    if (selectedChunk && selectedChunk.filename === filename) {
      const remainingChunks = chunks.filter(
        (chunk) => chunk.filename !== filename && chunk.status !== "deleted"
      );
      if (remainingChunks.length > 0) {
        setSelectedChunkId(remainingChunks[0].chunk_id);
      } else {
        setSelectedChunkId(null);
      }
    }
  };

  const handleCommitSuccess = async () => {
    await handleLoadChunks();
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
      }))
    );
  };

  if (!isInitialized) {
    return (
      <div>
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
          <Image src={logo} className="my-4 mx-auto" alt="optim-rag" />
          <Card className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-slate-900">Session Manager</CardTitle>
              <CardDescription className="text-slate-500">
                Create, list, or delete sessions on the front-end. You can still
                load any session by ID.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              {/* Existing Sessions */}
              <section>
                <h3 className="text-sm font-medium text-slate-700 mb-2">
                  Existing Sessions
                </h3>
                <div className="rounded-2xl bg-slate-100 p-3 max-h-56 overflow-auto">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No sessions yet. Create one below.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {sessions.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-800 truncate">
                              {s.sessionName}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              ID: {s.id} •{" "}
                              {new Date(s.createdAt).toLocaleString()}
                              {/* {s.archiveName ? ` • ZIP: ${s.archiveName}` : ""} */}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSessionId(s.id)
                                setSessionName(s.sessionName)
                              }}
                              title="Use this session ID"
                              className="rounded-2xl bg-slate-300 hover:bg-slate-400 border-0"
                            >
                              Use
                            </Button>
                            <Button
                              size="icon"
                              onClick={async () => {
                                try {
                                  setIsSessionOp(true);
                                  await feDeleteSession(s.id);
                                  const all = await listSessions();
                                  setSessions(all);
                                  if (sessionId === s.id) setSessionId("");
                                } finally {
                                  setIsSessionOp(false);
                                }
                              }}
                              disabled={isSessionOp}
                              aria-label={`Delete session ${s.sessionName}`}
                              title="Delete session"
                              className="rounded-full bg-red-600 hover:bg-red-700 text-white border-0"
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
              <section className="space-y-4">
                <h3 className="text-sm font-medium text-slate-700">
                  Create New Session
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newSessionName" className="text-slate-700">
                      Session Name
                    </Label>
                    <Input
                      id="newSessionName"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      placeholder="e.g., Q3 Reports"
                      disabled={isSessionOp}
                      className="rounded-2xl bg-slate-100 text-slate-800 border-0 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipUpload" className="text-slate-700">
                      Upload ZIP
                    </Label>
                    <Input
                      id="zipUpload"
                      type="file"
                      accept=".zip"
                      onChange={(e) =>
                        setNewSessionZip(e.target.files?.[0] || null)
                      }
                      disabled={isSessionOp}
                      className="rounded-2xl bg-slate-100 text-slate-800 border-0 cursor-pointer focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={async () => {
                      if (!newSessionZip || !newSessionName) {
                        setError("Zip file or Session name missing.");
                        return;
                      } else if (
                        sessions.some(
                          (session) => session.sessionName === newSessionName
                        )
                      ) {
                        setError("A session with this name already exists.");
                        return;
                      }
                      try {
                        setError(null);
                        setIsSessionOp(true);
                        const created = await feCreateSession(
                          newSessionZip,
                          newSessionName
                        );
                        const all = await listSessions();
                        setSessions(all);
                        setSessionId(created.id);
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Failed to create session"
                        );
                      } finally {
                        setIsSessionOp(false);
                      }
                    }}
                    disabled={isSessionOp || !newSessionZip}
                    className="rounded-2xl bg-blue-500 hover:bg-blue-600 text-white border-0"
                  >
                    {isSessionOp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Creating...
                      </>
                    ) : (
                      "Create Session"
                    )}
                  </Button>
                </div>
              </section>

              {/* Manual Session ID */}
              <section className="space-y-2">
                <Label htmlFor="sessionId" className="text-slate-700">
                  Manual Session ID
                </Label>
                <Input
                  id="sessionId"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter session ID..."
                  disabled={isLoading || isSessionOp}
                  className="rounded-2xl bg-slate-100 text-slate-800 border-0 focus:ring-2 focus:ring-blue-500"
                />
              </section>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-2xl">
                  {error}
                </div>
              )}

              <Button
                onClick={handleLoadChunks}
                disabled={isLoading || !sessionId.trim()}
                className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 text-white border-0"
              >
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
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Left Panel - Chunk List */}
      <div className="w-fit flex-shrink-0">
        <ChunkList
          chunks={chunks}
          selectedChunkId={selectedChunkId}
          onSelectChunk={handleSelectChunk}
          onAddChunk={handleAddChunk}
          wordLimit={wordLimit}
          onWordLimitChange={setWordLimit}
          onCommitSuccess={handleCommitSuccess}
          sessionId={sessionId}
          sessionName={sessionName}
          uploadedFiles={uploadedFiles}
          onFileUpload={handleFileUpload}
          onFileDelete={handleFileDelete}
          onDeleteFileChunks={handleDeleteFileChunks} // Added file deletion handler for file chunk deletion
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
  );
}
