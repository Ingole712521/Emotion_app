"use client";

import { useEffect, useRef, useState } from "react";

type Role = "user" | "assistant";

type Msg = { role: Role; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextUser: Msg = { role: "user", content: trimmed };
    setInput("");
    setError(null);
    setMessages((m) => [...m, nextUser]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, nextUser].map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      console.log(res)

      const data = (await res.json()) as { content?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      if (!data.content) {
        throw new Error("No reply from server.");
      }

      setMessages((m) => [...m, { role: "assistant", content: data.content! }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col px-4 py-6">
      <header className="mb-4 shrink-0 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Quiet space
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          A simple chat. Nothing is saved on this app; your words still go to
          the AI service you configured.
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Say what is on your mind. I will listen and respond gently.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-8 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "mr-8 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
            }
          >
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              {m.role === "user" ? "You" : "Companion"}
            </span>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {loading && (
          <p className="text-sm italic text-zinc-500">Thinking…</p>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mt-2 shrink-0 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-3 flex shrink-0 gap-2">
        <textarea
          className="min-h-[44px] flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          rows={2}
          placeholder="Type here…"
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          className="self-end rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Send
        </button>
      </div>
    </div>
  );
}
