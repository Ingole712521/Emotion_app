import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a calm, emotionally intelligent companion. Your goals:
- Help the person feel safe, heard, and less alone. Use a warm, gentle tone.
- Validate feelings without judging. Ask soft, open questions only when helpful.
- Never diagnose mental health conditions or replace professional care. If someone may be in danger or in crisis, encourage reaching local emergency services or a trusted person, briefly and kindly.
- Do not claim messages are "stored nowhere" or guarantee absolute privacy; providers may process data. Be honest and reassuring without overpromising.
Keep replies concise unless the person clearly wants more depth.`;

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

function getBaseUrl(): string {
  const raw =
    process.env.ANTHROPIC_BASE_URL?.trim() || "https://openrouter.ai/api";
  return raw.replace(/\/$/, "");
}

function getModel(): string {
  return (
    process.env.ANTHROPIC_DEFAULT_SONNET_MODEL?.trim() ||
    process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL?.trim() ||
    process.env.ANTHROPIC_DEFAULT_OPUS_MODEL?.trim() ||
    "openai/gpt-4o-mini"
  );
}

function getApiToken(): string | undefined {
  return (
    process.env.ANTHROPIC_AUTH_TOKEN?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim()
  );
}

export async function POST(req: Request) {
  const token = getApiToken();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "No API key on the server. Add ANTHROPIC_AUTH_TOKEN (or OPENROUTER_API_KEY) to .env.local in the project root, then restart `npm run dev`.",
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

  const url = `${getBaseUrl()}/v1/chat/completions`;
  const model = getModel();

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
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
