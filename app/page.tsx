"use client";

import { useEffect, useId, useRef, useState } from "react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** One shared visual language: warm stone base, rose = you, sage = support. */
const shell =
  "relative isolate flex min-h-dvh flex-col bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-50";
const softGlow = {
  backgroundImage: `
    radial-gradient(ellipse 85% 55% at 50% -15%, rgb(251 113 133 / 0.12), transparent),
    radial-gradient(ellipse 55% 45% at 100% 40%, rgb(52 211 153 / 0.09), transparent),
    radial-gradient(ellipse 50% 35% at 0% 85%, rgb(244 63 94 / 0.06), transparent)
  `,
} as const;

export default function Home() {
  const formId = useId();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

    const before = messages;
    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      content: trimmed,
    };
    const next = [...before, userMsg];
    setInput("");
    setError(null);
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = (await res.json()) as { content?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }
      if (!data.content) {
        throw new Error("No reply from server.");
      }

      setMessages((prev) => [
        ...prev,
        { id: newId(), role: "assistant", content: data.content! },
      ]);
    } catch (e) {
      setMessages(before);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={shell}>
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90 dark:opacity-60"
        style={softGlow}
      />

      <header className="shrink-0 border-b border-rose-100/60 bg-stone-100/85 px-4 py-4 backdrop-blur-md dark:border-rose-900/20 dark:bg-stone-950/85">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300"
              aria-hidden
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </span>
            <h1 className="text-lg font-semibold tracking-tight text-stone-800 dark:text-stone-100">
              Emotional support
            </h1>
          </div>
          <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            Only for talking through feelings—stress, sadness, worry, or
            anything on your heart. You on the{" "}
            <span className="font-medium text-rose-700 dark:text-rose-300">
              right
            </span>
            , supportive replies on the{" "}
            <span className="font-medium text-emerald-700 dark:text-emerald-300">
              left
            </span>
            . Nothing is saved in this app; your AI provider still sees what you
            send.
          </p>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-3 py-4 sm:px-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-rose-100/80 bg-white/90 shadow-md shadow-rose-100/40 ring-1 ring-stone-900/5 dark:border-stone-700/80 dark:bg-stone-900/75 dark:shadow-none dark:ring-white/5">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden bg-stone-50/50 px-3 py-5 sm:px-5 dark:bg-stone-900/40">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center gap-4 px-4 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/40">
                  <svg
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <p className="max-w-sm text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  When you are ready, write what you feel. Your words appear on
                  the right in rose; gentle support comes back on the left in
                  sage tones—same calm style throughout.
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex w-full flex-col gap-1.5 ${m.role === "user" ? "items-end chat-enter-user" : "items-start chat-enter-support"}`}
              >
                <span
                  className={`px-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${m.role === "user" ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}
                >
                  {m.role === "user" ? "You" : "Support"}
                </span>
                <div
                  className={`max-w-[min(100%,20rem)] rounded-2xl px-4 py-3 text-[15px] leading-relaxed sm:max-w-[85%] sm:text-base ${m.role === "user" ? "rounded-br-md bg-linear-to-br from-rose-600 to-rose-700 text-white shadow-md shadow-rose-900/15 dark:from-rose-500 dark:to-rose-600" : "rounded-bl-md border border-emerald-200/80 bg-emerald-50/90 text-stone-800 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-stone-100"}`}
                >
                  <p className="whitespace-pre-wrap wrap-break-word">{m.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-typing-wrap flex w-full flex-col items-start gap-1.5">
                <span className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
                  Support
                </span>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-emerald-200/80 bg-emerald-50/90 px-4 py-3.5 dark:border-emerald-800/50 dark:bg-emerald-950/35">
                  <span className="chat-typing-dot size-2 rounded-full bg-emerald-400 dark:bg-emerald-500" />
                  <span className="chat-typing-dot size-2 rounded-full bg-emerald-400 dark:bg-emerald-500" />
                  <span className="chat-typing-dot size-2 rounded-full bg-emerald-400 dark:bg-emerald-500" />
                </div>
              </div>
            )}

            <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
          </div>

          <div className="shrink-0 border-t border-rose-100/70 bg-stone-50/95 p-3 dark:border-stone-700/80 dark:bg-stone-900/90">
            {error && (
              <p
                className="mb-2 rounded-xl border border-rose-200/80 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-200"
                role="alert"
              >
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label htmlFor={formId} className="sr-only">
                Share how you feel
              </label>
              <textarea
                id={formId}
                className="min-h-[48px] flex-1 resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 shadow-inner outline-none transition-[box-shadow,border-color] placeholder:text-stone-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-200/80 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-rose-700 dark:focus:ring-rose-900/40"
                rows={2}
                placeholder="How are you feeling right now?"
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
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-rose-600 to-rose-700 px-6 text-sm font-semibold text-white shadow-md shadow-rose-900/20 transition hover:from-rose-500 hover:to-rose-600 disabled:pointer-events-none disabled:opacity-40 dark:from-rose-500 dark:to-rose-600 dark:hover:from-rose-400 dark:hover:to-rose-500"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] tracking-wide text-stone-500 dark:text-stone-500">
              Enter to send · Shift+Enter for a new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
