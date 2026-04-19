import { NextResponse } from "next/server";
import { resolveChatConfig } from "@/lib/chatgpt-local-settings";

const SYSTEM_PROMPT = `You exist only for emotional support. Nothing else is in scope.

Your role: help the person feel heard, steadier, and less alone. Use a calm, warm, non-judgmental tone. Reflect feelings in your own words, validate them, and offer gentle coping ideas (breathing, grounding, small next steps, self-compassion). Ask short, kind questions only when they help them open up.

Stay on topic. If they ask for coding, homework, legal or medical advice, investments, trivia, or general chat unrelated to feelings, reply briefly with care: this space is only for emotional support, and invite them to share what they are going through emotionally instead. Do not answer the off-topic request.

Never diagnose disorders or replace therapists, doctors, or crisis services. If they may hurt themselves or others, or are in immediate danger, urge them to contact local emergency services or a trusted person right away, in a few clear sentences.

Do not promise total privacy; an AI provider may process messages. Be honest and kind.

Keep answers concise unless they clearly want more depth.`;

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

export async function POST(req: Request) {
  const { token, completionsUrl, model } = await resolveChatConfig();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "No OpenRouter API key on the server. Set OPENROUTER_API_KEY in .env.local or under `env` in .chatgpt/setting.local.json, then restart `npm run dev`.",
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { messages?: unknown }).messages)
  ) {
    return NextResponse.json(
      { error: "Expected { messages: ChatMessage[] }." },
      { status: 400 },
    );
  }

  const incoming = (body as { messages: ChatMessage[] }).messages;
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...incoming.filter(
      (m): m is ChatMessage =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.length > 0,
    ),
  ];

  if (messages.length <= 1) {
    return NextResponse.json(
      { error: "Send at least one user or assistant message." },
      { status: 400 },
    );
  }

  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim();
  const title = process.env.OPENROUTER_APP_TITLE?.trim() || "Emotional support";

  const upstream = await fetch(completionsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(referer ? { "HTTP-Referer": referer } : {}),
      "X-OpenRouter-Title": title,
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return NextResponse.json(
      { error: text || upstream.statusText },
      { status: upstream.status },
    );
  }

  let parsed: { choices?: { message?: { content?: string } }[] };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    return NextResponse.json(
      { error: "Bad response from model API." },
      { status: 502 },
    );
  }

  const content = parsed.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    return NextResponse.json(
      { error: "Empty model reply." },
      { status: 502 },
    );
  }

  return NextResponse.json({ content });
}
