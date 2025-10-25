"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { getChatHistory, sendChat, deleteChat, type ChatMessage, type ChatModel } from "@/lib/api"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import MarkdownRenderer from "@/components/markdown-renderer";

const fetcher = (sessionId: string) => getChatHistory(sessionId);

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <span
        className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </span>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("sessionId") || "";

  const { data, error, isLoading, mutate } = useSWR(
    sessionId ? ["chat-history", sessionId] : null,
    () => fetcher(sessionId),
    { revalidateOnFocus: false }
  );

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [model, setModel] = useState<ChatModel>("gpt-5")

  const messages = useMemo<ChatMessage[]>(() => data?.messages ?? [], [data]);

  const handleSend = async () => {
    const content = input.trim();
    if (!sessionId || !content) return;

    // optimistic update: append user message immediately
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setInput("");
    setIsSending(true);
    await mutate(
      async () => {
        const res = await sendChat(sessionId, nextMessages, model);
        const finalMessages =
          res.messages && res.messages.length > 0
            ? res.messages
            : [...nextMessages, res.reply];
        return { session_id: res.session_id, messages: finalMessages };
      },
      {
        optimisticData: { session_id: sessionId, messages: nextMessages },
        rollbackOnError: true,
        revalidate: false,
        populateCache: true,
      }
    ).finally(() => setIsSending(false));
  };

  if (!sessionId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No sessionId provided. Open chat from the Chunk Editor after
              loading a session.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const handleDelete = () => {
    if (!sessionId) return
    deleteChat(sessionId, model)
    mutate({ session_id: sessionId, messages: [] }, false)
  }

  return (
    <main className="mx-auto h-screen max-w-7xl flex flex-col p-6 gap-6 bg-none">
      {/* Header */}
      <header className="flex items-center justify-between rounded-2xl bg-white shadow-md px-6 py-4">
        <h1 className="text-2xl font-bold text-slate-800">
        Session <span className="text-lg font-mono text-slate-800">{sessionId}</span>
        </h1>
        <div className="flex gap-3">
          {/* Back to Editor Button */}
          <Button
            size="sm"
            onClick={() => router.push("/")}
            className="rounded-2xl px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold border-0"
          >
            <ArrowLeft/> Back to Editor
          </Button>

          {/* Delete Chat Button */}
          <Button
            size="sm"
            onClick={handleDelete}
            className="rounded-2xl px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold border-0"
          >
            Delete Chat
          </Button>
        </div>
      </header>

      {/* Messages Section */}
      <section className="flex-1 w-full overflow-auto rounded-2xl bg-none shadow-sm p-6 space-y-6">
        {isLoading ? (
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading conversation...
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">Failed to load chat history</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-slate-500 text-center">
            No messages yet. Say hello!
          </div>
        ) : (
          <>
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              const isAssistant = m.role === "assistant";

              if (isUser) {
                return (
                  <div key={i} className="flex items-start gap-3 max-w-3xl">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-blue-600 text-white">
                        U
                      </AvatarFallback>
                    </Avatar>
                    <div className="px-4 py-3 bg-slate-300 rounded-2xl text-sm font-medium shadow-sm">
                      <MarkdownRenderer content={m.content} />
                    </div>
                  </div>
                );
              }

              if (isAssistant) {
                return (
                  <div
                    key={i}
                    className="mx-auto w-full p-6 bg-slate-100 rounded-2xl shadow-sm text-slate-800 font-medium"
                  >
                    <MarkdownRenderer
                      content={m.content}
                      className="text-base leading-relaxed text-pretty"
                    />
                  </div>
                );
              }

              // fallback (system, etc.)
              return (
                <div key={i} className="mx-auto w-full max-w-3xl">
                  <div className="text-sm text-slate-500 mb-1">{m.role}</div>
                  <MarkdownRenderer
                    content={m.content}
                    className="text-base leading-relaxed text-slate-700"
                  />
                </div>
              );
            })}

            {isSending && (
              <div className="mx-auto w-full max-w-3xl">
                <div className="text-base leading-relaxed text-slate-400">
                  <TypingDots />
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Input Section */}
      <section className="flex items-center gap-3 bg-slate-200 border-none rounded-2xl shadow-lg px-4 py-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isSending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 rounded-2xl border-0 font-medium text-slate-800"
        />

        <div className="rounded-2xl bg-slate-100 text-slate-800 px-3 py-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ChatModel)}
            className="bg-transparent text-slate-800 font-semibold outline-none rounded-xl"
          >
            <option value="gpt-5">gpt-5</option>
            {/* <option value="ollama-local">ollama-server</option> */}
          </select>
        </div>

        <Button
          onClick={handleSend}
          disabled={isSending || !input.trim()}
          className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 font-semibold border-0"
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending
            </>
          ) : (
            "Send"
          )}
        </Button>
      </section>
    </main>
  );
}
