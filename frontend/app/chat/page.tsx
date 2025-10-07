"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { getChatHistory, sendChat, deleteChat, type ChatMessage, type ChatModel } from "@/lib/api"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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
    <main className="mx-auto h-screen max-w-7xl flex flex-col p-4 gap-4 bg-background">
      <header className="flex items-center justify-center mx-auto">
        <h1 className="text-lg font-semibold text-pretty mx-2">
          Chat — Session {sessionId}
        </h1>
        <div className="flex gap-2">
          <Button className="mx-2 rounded-full px-3 py-2 bg-red-500 hover:bg-red-300 font-semibold" size="sm" onClick={handleDelete}>
            Delete Chat
          </Button>
        </div>
      </header>

      <section className="mx-auto flex-1 w-full overflow-auto rounded p-4 space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading conversation...
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">
            Failed to load chat history
          </div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center">
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
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-slate-300">
                        U
                      </AvatarFallback>
                    </Avatar>
                    <div className="px-3 py-2 bg-gray-300 text-foreground rounded-xl font-bold">
                      <MarkdownRenderer content={m.content} />
                    </div>
                  </div>
                );
              }

              if (isAssistant) {
                return (
                  <div
                    key={i}
                    className="mx-auto w-full p-16 bg-gray-200 rounded-xl font-semibold"
                  >
                    <MarkdownRenderer
                      content={m.content}
                      className="text-base leading-relaxed text-foreground text-pretty"
                    />
                  </div>
                );
              }

              // fallback for other roles (system, etc.)
              return (
                <div key={i} className="mx-auto w-full max-w-3xl">
                  <div className="text-sm text-muted-foreground">{m.role}</div>
                  <MarkdownRenderer
                    content={m.content}
                    className="text-base leading-relaxed"
                  />
                </div>
              );
            })}

            {isSending && (
              <div className="mx-auto w-full max-w-3xl">
                <div className="text-base leading-relaxed text-muted-foreground">
                  <TypingDots />
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="flex items-center gap-2 bg-gray-200 rounded-full py-2 px-3">
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
          className="border-none font-bold"
        />
        <div className="rounded-full bg-gray-400 text-black px-3 py-2">
          <select
              value={model}
              onChange={(e) => setModel(e.target.value as ChatModel)}
              className="bg-gray-400 text-black font-bold outline-none rounded-xl"
            >
              <option value="gpt-5">gpt-5</option>
              <option value="ollama-local">ollama-server</option>
          </select>
        </div>
        <Button
          className="rounded-full bg-gray-400 hover:bg-gray-300 text-black"
          onClick={handleSend}
          disabled={isSending || !input.trim()}
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
